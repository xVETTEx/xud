import Logger from '../Logger';
import { EventEmitter } from 'events';
import { SwapDeal, Route } from './types';
import { SwapClientType } from '../constants/enums';

enum ClientStatus {
  /** The starting status before a client has initialized. */
  NotInitialized,
  /** The client has been initialized but has not attempted to connect to the server yet. */
  Initialized,
  /** The client is permanently disabled. */
  Disabled,
  /** The server cannot be reached or is not responding properly. */
  Disconnected,
  /** The server is reachable and operational. */
  ConnectionVerified,
  /** The server is reachable but is not ready pending completion of blockchain or network sync. */
  OutOfSync,
  /** The server is reachable but needs to be unlocked before it accepts calls. */
  WaitingUnlock,
  /** The server has been unlocked, but its status has not been verified yet. */
  Unlocked,
  /** The client could not be initialized due to faulty configuration. */
  Misconfigured,
}

type ChannelBalance = {
  /** The cumulative balance of open channels denominated in satoshis. */
  balance: number,
  /** The cumulative balance of pending channels denominated in satoshis. */
  pendingOpenBalance: number,
  /** The cumulative balance of inactive channels denominated in satoshis. */
  inactiveBalance: number,
};

type WalletBalance = {
  /** The balance of the wallet. */
  totalBalance: number,
  /** The confirmed balance of a wallet (with >= 1 confirmations). */
  confirmedBalance: number,
  /** The unconfirmed balance of a wallet (with 0 confirmations). */
  unconfirmedBalance: number,
};

type TradingLimits = {
  /** Max outbound capacity for a distinct channel denominated in satoshis. */
  maxSell: number,
  /** Max inbound capacity for a distinct channel denominated in satoshis. */
  maxBuy: number,
};

export type SwapClientInfo = {
  newIdentifier?: string;
  newUris?: string[];
};

export enum PaymentState {
  Succeeded,
  Failed,
  Pending,
}

export type PaymentStatus = {
  state: PaymentState,
  preimage?: string,
};

interface SwapClient {
  on(event: 'connectionVerified', listener: (swapClientInfo: SwapClientInfo) => void): this;
  once(event: 'initialized', listener: () => void): this;
  emit(event: 'connectionVerified', swapClientInfo: SwapClientInfo): boolean;
  emit(event: 'initialized'): boolean;
}

/**
 * A base class to represent an external swap client such as lnd or Raiden.
 */
abstract class SwapClient extends EventEmitter {
  /**
   * The number of blocks of lock time to expect on the final hop of an incoming swap payment.
   */
  public abstract readonly finalLock: number;
  public abstract readonly type: SwapClientType;
  /** Time in milliseconds between attempts to recheck connectivity to the client. */
  public static readonly RECONNECT_INTERVAL = 5000;
  protected status: ClientStatus = ClientStatus.NotInitialized;
  protected reconnectionTimer?: NodeJS.Timer;

  private updateCapacityTimer?: NodeJS.Timer;
  /** The maximum amount of time we will wait for the connection to be verified during initialization. */
  private static INITIALIZATION_TIME_LIMIT = 5000;
  /** Time in milliseconds between updating the maximum outbound capacity. */
  private static CAPACITY_REFRESH_INTERVAL = 3000;

  constructor(public logger: Logger, protected disable: boolean) {
    super();
  }

  public abstract get minutesPerBlock(): number;

  public abstract get label(): string;

  /**
   * Returns the total balance available across all channels and updates the maximum
   * outbound capacity.
   * @param currency the currency whose balance to query for, otherwise all/any
   * currencies supported by this client are included in the balance.
   */
  public abstract channelBalance(currency?: string): Promise<ChannelBalance>;
  /**
   * Returns total unspent outputs (confirmed and unconfirmed),
   * all confirmed unspent outputs
   * and all unconfirmed unspent outputs under control of the wallet).
   * @param currency the currency whose balance to query for, otherwise all/any
   * currencies supported by this client are included in the balance.
   */
  public abstract walletBalance(currency?: string): Promise<WalletBalance>;
  /**
   * Returns and updates the maximum outbound and inbound capacities for a distinct channel.
   * @param currency the currency whose trading limits to query for, otherwise all/any
   * currencies supported by this client are included in the trading limits.
   */
  public abstract tradingLimits(currency?: string): Promise<TradingLimits>;

  public abstract totalOutboundAmount(currency?: string): number;
  public abstract maxChannelOutboundAmount(currency?: string): number;
  public abstract maxChannelInboundAmount(currency?: string): number;
  protected abstract updateCapacity(): Promise<void>;

  public verifyConnectionWithTimeout = () => {
    // don't wait longer than the allotted time for the connection to
    // be verified to prevent initialization from hanging
    return new Promise<void>((resolve, reject) => {
      const verifyTimeout = setTimeout(() => {
        // we could not verify the connection within the allotted time
        this.logger.info(`could not verify connection within initialization time limit of ${SwapClient.INITIALIZATION_TIME_LIMIT}`);
        this.setStatus(ClientStatus.Disconnected);
        resolve();
      }, SwapClient.INITIALIZATION_TIME_LIMIT);
      this.verifyConnection().then(() => {
        clearTimeout(verifyTimeout);
        resolve();
      }).catch(reject);
    });
  }

  public init = async () => {
    // up front checks before initializing client
    if (this.disable) {
      this.setStatus(ClientStatus.Disabled);
      return;
    }

    if (!this.isNotInitialized() && !this.isMisconfigured()) {
      // we only initialize from NotInitialized or Misconfigured status
      this.logger.warn(`can not init in ${this.status} status`);
      return;
    }
    // client specific initialization
    await this.initSpecific();

    // final steps to complete initialization
    this.setStatus(ClientStatus.Initialized);
    this.setTimers();
    this.emit('initialized');
    await this.verifyConnectionWithTimeout();
  }

  protected abstract async initSpecific(): Promise<void>;

  protected setConnected = async (newIdentifier?: string, newUris?: string[]) => {
    await this.updateCapacity();
    this.setStatus(ClientStatus.ConnectionVerified);
    this.emit('connectionVerified', {
      newIdentifier,
      newUris,
    });

  }

  protected setStatus = (status: ClientStatus): void => {
    if (this.status === status) {
      return;
    }

    this.logger.info(`${this.constructor.name} status: ${ClientStatus[status]}`);
    this.status = status;
  }

  private updateCapacityTimerCallback = async () => {
    if (this.isConnected()) {
      await this.updateCapacity();
    }
  }

  private reconnectionTimerCallback = async () => {
    if (this.status === ClientStatus.Disconnected
        || this.status === ClientStatus.OutOfSync
        || this.status === ClientStatus.WaitingUnlock
        || this.status === ClientStatus.Unlocked
      ) {
      try {
        await this.verifyConnection();
      } catch (err) {
        this.logger.debug(`reconnectionTimer errored with ${err}`);
      }
    }
    if (this.reconnectionTimer) {
      this.reconnectionTimer.refresh();
    }
  }

  private setTimers = () => {
    if (!this.updateCapacityTimer) {
      this.updateCapacityTimer = setInterval(this.updateCapacityTimerCallback, SwapClient.CAPACITY_REFRESH_INTERVAL);
    }
    if (!this.reconnectionTimer) {
      this.reconnectionTimer = setTimeout(this.reconnectionTimerCallback, SwapClient.RECONNECT_INTERVAL);
    }
  }

  /**
   * Verifies that the swap client can be reached and is in an operational state
   * and sets the [[ClientStatus]] accordingly.
   */
  protected abstract async verifyConnection(): Promise<void>;

  /**
   * Sends payment according to the terms of a swap deal.
   * @returns the preimage for the swap
   */
  public abstract async sendPayment(deal: SwapDeal): Promise<string>;

  /**
   * Sends the smallest amount supported by the client to the given destination.
   * Throws an error if the payment fails.
   * @returns the preimage for the payment hash
   */
  public abstract async sendSmallestAmount(rHash: string, destination: string, currency: string): Promise<string>;

  /**
   * Gets routes for the given currency, amount, and swap identifier.
   * @param units the capacity the route must support denominated in the smallest units supported by its currency
   * @param destination the identifier for the receiving node
   * @returns routes
   */
  public abstract async getRoute(units: number, destination: string, currency: string, finalCltvDelta?: number): Promise<Route | undefined>;

  /**
   * Checks whether it is possible to route a payment to a node. This does not test or guarantee
   * that a payment can be routed successfully, only whether it is possible to do so currently
   * given the state of the network and graph - without creating new channels or edges.
   */
  public abstract async canRouteToNode(destination: string, currency?: string): Promise<boolean>;

  /**
   * @param units the amount of the invoice denominated in the smallest units supported by its currency
   */
  public abstract async addInvoice(rHash: string, units: number, expiry?: number): Promise<void>;

  public abstract async settleInvoice(rHash: string, rPreimage: string): Promise<void>;

  public abstract async removeInvoice(rHash: string): Promise<void>;

  /**
   * Checks to see whether we've made a payment using a given rHash.
   * @returns the preimage for the payment, or `undefined` if no payment was made
   */
  public abstract async lookupPayment(rHash: string, currency?: string, destination?: string): Promise<PaymentStatus>;

  /**
   * Gets the block height of the chain backing this swap client.
   */
  public abstract async getHeight(): Promise<number>;

  /**
   * Opens a payment channel given peerIdentifier, amount
   * optional currency and optional lndUris.
   */
  public abstract async openChannel(
    { peerIdentifier, units, currency, lndUris }:
    {
      peerIdentifier: string,
      units: number,
      currency?: string,
      lndUris?: string[],
    },
  ): Promise<void>;

  public isConnected(): boolean {
    return this.status === ClientStatus.ConnectionVerified;
  }
  public isDisabled(): boolean {
    return this.status === ClientStatus.Disabled;
  }
  public isMisconfigured(): boolean {
    return this.status === ClientStatus.Misconfigured;
  }
  /**
   * Returns `true` if the client is enabled and configured properly.
   */
  public isOperational(): boolean {
    return !this.isDisabled() && !this.isMisconfigured();
  }
  public isDisconnected(): boolean {
    return this.status === ClientStatus.Disconnected;
  }
  public isWaitingUnlock(): boolean {
    return this.status === ClientStatus.WaitingUnlock;
  }
  public isNotInitialized(): boolean {
    return this.status === ClientStatus.NotInitialized;
  }
  public isOutOfSync(): boolean {
    return this.status === ClientStatus.OutOfSync;
  }

  /** Ends all connections, subscriptions, and timers for for this client. */
  public close() {
    this.disconnect();
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = undefined;
    }
    if (this.updateCapacityTimer) {
      clearInterval(this.updateCapacityTimer);
      this.updateCapacityTimer = undefined;
    }
    this.removeAllListeners();
  }
  protected abstract disconnect(): void;
}

export default SwapClient;
export { ClientStatus, ChannelBalance, WalletBalance, TradingLimits };
