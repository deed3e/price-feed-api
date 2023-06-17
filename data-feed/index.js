import 'dotenv/config'
import WebSocket from 'ws';
import { createClient } from 'redis';

var dict= []
dict.BTC= {}
const interval = 300 // 5m

const ws = new WebSocket(process.env.COINBASE_WSS_URL)
const client = createClient({
  url:'redis://localhost:6379'
});

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();

ws.on('open', function open() {
  ws.send(JSON.stringify({
    "type": "subscribe",
    "channels": [{ "name": "ticker", "product_ids": ["BTC-USD"] }]
  }));
})

ws.on('message',async function incoming(data) {
  const message = JSON.parse(data)

  if (message.type === 'ticker') {
    const { product_id, price, time} = message
    const timestamp = new Date(time).getTime()
    const key = Math.trunc((timestamp / 1000 ) / interval) * interval
    await client.hSet('BTC',{
        o:dict.BTC[key]?.o ? dict.BTC[key].o : parseFloat(price),
        c:parseFloat(price),
        h:Math.max(dict.BTC[key]?.o,dict.BTC[key]?.l,dict.BTC[key]?.h,parseFloat(price)) || parseFloat(price),
        l:Math.min(dict.BTC[key]?.o,dict.BTC[key]?.l,dict.BTC[key]?.h,parseFloat(price)) || parseFloat(price),
        time: key
    });
    // dict.BTC[key]={
    //     o:dict.BTC[key]?.o ? dict.BTC[key].o : parseFloat(price),
    //     c:parseFloat(price),
    //     h:Math.max(dict.BTC[key]?.o,dict.BTC[key]?.l,dict.BTC[key]?.h,parseFloat(price)) || parseFloat(price),
    //     l:Math.min(dict.BTC[key]?.o,dict.BTC[key]?.l,dict.BTC[key]?.h,parseFloat(price)) || parseFloat(price),
    //     time: key
    // }
    console.log(await client.hGetAll('BTC'))
  }
})