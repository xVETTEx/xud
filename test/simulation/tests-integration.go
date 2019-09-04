package main

import (
	"fmt"
	"github.com/ExchangeUnion/xud-simulation/xudrpc"
	"github.com/ExchangeUnion/xud-simulation/xudtest"
	"time"
)

var integrationTestCases = []*testCase{
	{
		name: "network initialization", // must be the first test case to be run
		test: testNetworkInit,
	},
	{
		name: "raiden swap",
		test: testRaidenSwap,
	},
	/*
		{
			name: "order matching and swap",
			test: testOrderMatchingAndSwap,
		},
			{
				name: "p2p discovery",
				test: testP2PDiscovery,
			},
				{
					name: "p2p incorrect public key",
					test: testP2PIncorrectPubKey,
				},
				{
					name: "p2p ban unban",
					test: testP2PBanUnban,
				},
				{
					name: "p2p already connected",
					test: testP2PAlreadyConnected,
				},
				{
					name: "order broadcast and invalidation",
					test: testOrderBroadcastAndInvalidation,
				},
				{
					name: "multiple hop swap",
					test: testMultiHopSwap,
				},
	*/
}

// testNetworkInit implements:
// 1) Verify connectivity to swap clients of all nodes.
// 2) Add currencies and pairs to all nodes.

// testNetworkInit must be the first test case to be run, and the only one
// allowed to alter the nodes critical state (peers, order book, etc.).
// All following test cases must cleanup their changes before finishing
// so that test cases would be stateless and won't be affected
// by their preceding ones.
func testNetworkInit(net *xudtest.NetworkHarness, ht *harnessTest) {
	for _, node := range net.ActiveNodes {
		ht.act.init(node)
	}
}

// testP2PDiscovery implements:
// Connect Alice to Bob, Bob to Carol, Dave to Carol. After a short while, all of them should end up connected.
func testP2PDiscovery(net *xudtest.NetworkHarness, ht *harnessTest) {
	// Connect Alice to Bob.
	ht.act.connect(net.Alice, net.Bob)
	ht.act.verifyConnectivity(net.Alice, net.Bob)

	// Connect Bob to Carol.
	ht.act.connect(net.Bob, net.Carol)
	ht.act.verifyConnectivity(net.Bob, net.Carol)

	// Carol should hear about Alice from Bob,
	// and should end up connected to her.
	time.Sleep(1 * time.Second)
	ht.act.verifyConnectivity(net.Alice, net.Carol)

	// Connect Dave to Carol.
	ht.act.connect(net.Dave, net.Carol)
	ht.act.verifyConnectivity(net.Dave, net.Carol)

	// Dave should hear about Alice and Bob from Carol,
	// and should end up connected to them.
	time.Sleep(1 * time.Second)
	ht.act.verifyConnectivity(net.Alice, net.Dave)
	ht.act.verifyConnectivity(net.Bob, net.Dave)

	// Cleanup.
	ht.act.disconnect(net.Alice, net.Bob)
	ht.act.disconnect(net.Alice, net.Carol)
	ht.act.disconnect(net.Alice, net.Dave)
	ht.act.disconnect(net.Bob, net.Carol)
	ht.act.disconnect(net.Bob, net.Dave)
	ht.act.disconnect(net.Carol, net.Dave)
}

// testP2PIncorrectPubKey implements:
// Alice connects to Bob expecting an incorrect public key.
// Bob should reject the connection due to auth invalid target.
func testP2PIncorrectPubKey(net *xudtest.NetworkHarness, ht *harnessTest) {
	// Alice connects to Bob while expecting an incorrect public key.
	incorrectPubKey := net.Bob.PubKey() + "Q"
	destNodeURI := fmt.Sprintf("%v@%v", incorrectPubKey, net.Bob.Cfg.P2PAddr())
	reqConn := &xudrpc.ConnectRequest{NodeUri: destNodeURI}

	// Bob should reject the connection since Alice signed her handshake data
	// specifying a different public key target then his.
	_, err := net.Alice.Client.Connect(ht.ctx, reqConn)
	ht.assert.Error(err)
	ht.assert.Contains(err.Error(), fmt.Sprintf(
		"Peer %v disconnected from us due to AuthFailureInvalidTarget",
		incorrectPubKey+"@"+net.Bob.Cfg.P2PAddr()))
}

// testP2PBanUnban implements:
// 1) If Alice ban Bob, connection attempts from both directions should fail.
// 2) if Alice unban Bob, connection attempts from both directions should succeed.
func testP2PBanUnban(net *xudtest.NetworkHarness, ht *harnessTest) {
	// Alice to ban Bob.
	ht.act.ban(net.Alice, net.Bob)

	// Alice should not attempt to connect to Bob while he is banned.
	reqConn := &xudrpc.ConnectRequest{NodeUri: net.Bob.NodeURI()}
	_, err := net.Alice.Client.Connect(ht.ctx, reqConn)
	ht.assert.Error(err)
	ht.assert.Contains(err.Error(), fmt.Sprintf(
		"could not connect to node %v because it is banned", net.Bob.PubKey()))

	// If Bob connects to Alice, he should get rejected.
	reqConn = &xudrpc.ConnectRequest{NodeUri: net.Alice.NodeURI()}
	_, err = net.Bob.Client.Connect(ht.ctx, reqConn)
	ht.assert.Error(err)
	ht.assert.Contains(err.Error(), fmt.Sprintf(
		" Peer %v disconnected from us due to Banned",
		net.Alice.PubKey()+"@"+net.Alice.Cfg.P2PAddr()))

	// After Alice unban Bob, connection attempts from both directions should succeed.
	ht.act.unban(net.Alice, net.Bob)
	ht.act.connect(net.Alice, net.Bob)
	ht.act.disconnect(net.Alice, net.Bob)
	ht.act.connect(net.Bob, net.Alice)

	// Cleanup.
	ht.act.disconnect(net.Alice, net.Bob)
}

// testP2PAlreadyConnected implements:
// If Alice and Bob are already connected, connection attempts from both directions should fail.
func testP2PAlreadyConnected(net *xudtest.NetworkHarness, ht *harnessTest) {
	// Connect Alice to Bob.
	ht.act.connect(net.Alice, net.Bob)
	ht.act.verifyConnectivity(net.Alice, net.Bob)

	// Alice should not attempt to connect to Bob while they are already connected.
	reqConn := &xudrpc.ConnectRequest{NodeUri: net.Bob.NodeURI()}
	_, err := net.Alice.Client.Connect(ht.ctx, reqConn)
	ht.assert.Error(err)
	ht.assert.Contains(err.Error(), fmt.Sprintf(
		"node %v at %v already connected", net.Bob.PubKey(), net.Bob.Cfg.P2PAddr()))

	// Bob should not attempt to connect to Alice while they are already connected.
	reqConn = &xudrpc.ConnectRequest{NodeUri: net.Alice.NodeURI()}
	_, err = net.Bob.Client.Connect(ht.ctx, reqConn)
	ht.assert.Error(err)
	ht.assert.Contains(err.Error(), fmt.Sprintf(
		"node %v at %v already connected", net.Alice.PubKey(), net.Alice.Cfg.P2PAddr()))

	// Cleanup.
	ht.act.disconnect(net.Alice, net.Bob)
}

// testOrderBroadcastAndInvalidation implements:
// 1) Placed order should get broadcasted over the network, and added to connected peers' order books.
// 2) Removed order should get invalidated over the network, and removed from connected peers' order books.
func testOrderBroadcastAndInvalidation(net *xudtest.NetworkHarness, ht *harnessTest) {
	// Connect Alice to Bob.
	ht.act.connect(net.Alice, net.Bob)
	ht.act.verifyConnectivity(net.Alice, net.Bob)

	req := &xudrpc.PlaceOrderRequest{
		Price:    0.02,
		Quantity: 1000000,
		PairId:   "LTC/BTC",
		OrderId:  "random_order_id",
		Side:     xudrpc.OrderSide_BUY,
	}

	order := ht.act.placeOrderAndBroadcast(net.Alice, net.Bob, req)
	ht.act.removeOrderAndInvalidate(net.Alice, net.Bob, order)

	// Cleanup.
	ht.act.disconnect(net.Alice, net.Bob)
}

func testRaidenSwap(net *xudtest.NetworkHarness, ht *harnessTest) {
	// Connect Alice to Bob.
	ht.act.connect(net.Alice, net.Bob)
	ht.act.verifyConnectivity(net.Alice, net.Bob)

	// Getinfo
	fmt.Printf("\nwaiting for raidens to boot...\n")
	time.Sleep(45 * time.Second)
	infoReq := &xudrpc.GetInfoRequest{}
	res, err := net.Bob.Client.GetInfo(ht.ctx, infoReq)
	fmt.Printf("\nres is %v\n", res)
	fmt.Printf("\nerror is %v\n", err)

	listPairsReq := &xudrpc.ListPairsRequest{}
	listPairsRes, err := net.Bob.Client.ListPairs(ht.ctx, listPairsReq)
	fmt.Printf("\nbob listpairs %v\n", listPairsRes)
	fmt.Printf("\nerror is %v\n", err)

	// ht.act.openChannel(net.Bob, net.Alice, "BTC", 16000000)
	ht.act.openChannel(net.Bob, net.Alice, "WETH", 7500000)
	// wait for blocks to be mined
	time.Sleep(10 * time.Second)

	bobBalance, err := getBalance(ht.ctx, net.Bob)
	ht.assert.NoError(err)
	fmt.Printf("\nBob balance %v\n", bobBalance.btc.channel)

	aliceBalance, err := getBalance(ht.ctx, net.Alice)
	ht.assert.NoError(err)
	fmt.Printf("\nAlice balance %v\n", aliceBalance.btc.channel)

	aliceWethBalanceReq := &xudrpc.ChannelBalanceRequest{Currency: "WETH"}
	aliceWethBalanceRes, err := net.Alice.Client.ChannelBalance(ht.ctx, aliceWethBalanceReq)
	ht.assert.NoError(err)
	fmt.Printf("\nAlice WETH balance %v\n", aliceWethBalanceRes)

	bobWethBalanceReq := &xudrpc.ChannelBalanceRequest{Currency: "WETH"}
	bobWethBalanceRes, err := net.Bob.Client.ChannelBalance(ht.ctx, bobWethBalanceReq)
	ht.assert.NoError(err)
	fmt.Printf("\nBob WETH balance %v\n", bobWethBalanceRes)

	// Place an order on Alice.
	req := &xudrpc.PlaceOrderRequest{
		OrderId:  "maker_order_id",
		Price:    0.02,
		Quantity: 10000,
		PairId:   "WETH/BTC",
		Side:     xudrpc.OrderSide_BUY,
	}
	ht.act.placeOrderAndBroadcast(net.Alice, net.Bob, req)

	// Place a matching order on Bob.
	req = &xudrpc.PlaceOrderRequest{
		OrderId:  "taker_order_id",
		Price:    req.Price,
		Quantity: req.Quantity,
		PairId:   req.PairId,
		Side:     xudrpc.OrderSide_SELL,
	}
	ht.act.placeOrderAndSwap(net.Bob, net.Alice, req)

	time.Sleep(5 * time.Second)
	aliceWethBalanceReq = &xudrpc.ChannelBalanceRequest{Currency: "WETH"}
	aliceWethBalanceRes, err = net.Alice.Client.ChannelBalance(ht.ctx, aliceWethBalanceReq)
	ht.assert.NoError(err)
	fmt.Printf("\nAlice WETH balance %v\n", aliceWethBalanceRes)

	bobWethBalanceReq = &xudrpc.ChannelBalanceRequest{Currency: "WETH"}
	bobWethBalanceRes, err = net.Bob.Client.ChannelBalance(ht.ctx, bobWethBalanceReq)
	ht.assert.NoError(err)
	fmt.Printf("\nBob WETH balance %v\n", bobWethBalanceRes)

	// Place an order on Alice.
	req = &xudrpc.PlaceOrderRequest{
		OrderId:  "maker_order_id",
		Price:    0.02,
		Quantity: 1000,
		PairId:   "WETH/BTC",
		Side:     xudrpc.OrderSide_SELL,
	}
	ht.act.placeOrderAndBroadcast(net.Alice, net.Bob, req)

	// Place a matching order on Bob.
	req = &xudrpc.PlaceOrderRequest{
		OrderId:  "taker_order_id",
		Price:    req.Price,
		Quantity: req.Quantity,
		PairId:   req.PairId,
		Side:     xudrpc.OrderSide_BUY,
	}
	ht.act.placeOrderAndSwap(net.Bob, net.Alice, req)

	// Cleanup.
	ht.act.disconnect(net.Alice, net.Bob)
}

func testOrderMatchingAndSwap(net *xudtest.NetworkHarness, ht *harnessTest) {
	// Connect Alice to Bob.
	ht.act.connect(net.Alice, net.Bob)
	ht.act.verifyConnectivity(net.Alice, net.Bob)

	// Getinfo
	time.Sleep(10 * time.Second)
	infoReq := &xudrpc.GetInfoRequest{}
	res, err := net.Bob.Client.GetInfo(ht.ctx, infoReq)
	fmt.Printf("res is %v", res)
	fmt.Printf("error is %v", err)

	// Place an order on Alice.
	req := &xudrpc.PlaceOrderRequest{
		OrderId:  "maker_order_id",
		Price:    0.02,
		Quantity: 1000000,
		PairId:   "LTC/BTC",
		Side:     xudrpc.OrderSide_BUY,
	}
	ht.act.placeOrderAndBroadcast(net.Alice, net.Bob, req)

	// Place a matching order on Bob.
	req = &xudrpc.PlaceOrderRequest{
		OrderId:  "taker_order_id",
		Price:    req.Price,
		Quantity: req.Quantity,
		PairId:   req.PairId,
		Side:     xudrpc.OrderSide_SELL,
	}
	ht.act.placeOrderAndSwap(net.Bob, net.Alice, req)

	// Cleanup.
	ht.act.disconnect(net.Alice, net.Bob)
}

func testMultiHopSwap(net *xudtest.NetworkHarness, ht *harnessTest) {
	// Connect Alice to Dave.
	ht.act.connect(net.Alice, net.Dave)
	ht.act.verifyConnectivity(net.Alice, net.Dave)

	// Place a buy order on Alice.
	req := &xudrpc.PlaceOrderRequest{
		OrderId:  "maker_order_id",
		Price:    0.02,
		Quantity: 1000000,
		PairId:   "LTC/BTC",
		Side:     xudrpc.OrderSide_BUY,
	}
	ht.act.placeOrderAndBroadcast(net.Alice, net.Dave, req)

	// Place a matching order on Dave.
	req = &xudrpc.PlaceOrderRequest{
		OrderId:  "taker_order_id",
		Price:    req.Price,
		Quantity: req.Quantity,
		PairId:   req.PairId,
		Side:     xudrpc.OrderSide_SELL,
	}
	ht.act.placeOrderAndSwap(net.Dave, net.Alice, req)

	// Place a sell order on Dave.
	req = &xudrpc.PlaceOrderRequest{
		OrderId:  "maker_order_id2",
		Price:    req.Price,
		Quantity: req.Quantity,
		PairId:   req.PairId,
		Side:     xudrpc.OrderSide_SELL,
	}
	ht.act.placeOrderAndBroadcast(net.Dave, net.Alice, req)

	// Place a matching order on Alice.
	req = &xudrpc.PlaceOrderRequest{
		OrderId:  "taker_order_id2",
		Price:    req.Price,
		Quantity: req.Quantity,
		PairId:   req.PairId,
		Side:     xudrpc.OrderSide_BUY,
	}
	ht.act.placeOrderAndSwap(net.Alice, net.Dave, req)

	// Cleanup.
	ht.act.disconnect(net.Alice, net.Dave)
}
