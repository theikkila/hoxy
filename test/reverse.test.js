/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

//import { Proxy } from '../src/main'
import Proxy from '../src/proxy'
import streams from '../src/streams'
import assert from 'assert'
import http from 'http'

describe('reverse', function() {

  it('should accept a valid reverse proxy', () => {
    let proxy = new Proxy({
      reverse: 'http://example.com',
    })
  })

  it('should accept a valid reverse proxy', () => {
    let proxy = new Proxy({
      reverse: 'http://localhost:90',
    })
  })

  it('should reject an invalid reverse proxy', () => {
    assert.throws(() => {
      let proxy = new Proxy({
        reverse: '//////',
      })
    })
  })

  it('should reject an invalid reverse proxy', () => {
    assert.throws(() => {
      let proxy = new Proxy({
        reverse: 'foo:bar:baz',
      })
    })
  })

  it('should use a reverse proxy', done => {
    let server = http.createServer((req, res) => {
      res.end(req.url)
    }).listen(0, 'localhost', () => {
      server.on('error', done)
      let serverAddr = server.address()

      let proxy = new Proxy({
        reverse: `http://localhost:${serverAddr.port}`,
      }).listen(0, 'localhost', () => {
        proxy.intercept('request', function(req) {
          req.headers['x-foo'] = 'bar'
        })
        proxy.on('error', done)
        let proxyAddr = proxy.address()

        http.get({
          hostname: proxyAddr.address,
          port: proxyAddr.port,
          path: `http://localhost:${serverAddr.port}/foo`,
        }, res => {
          streams.collect(res).then(bod => {
            assert.equal(bod, '/foo')
            done()
          }, done)
        })
      })
    })
  })

  it('should accept a valid default reverse proxy map', () => {
    var reverseMap = new Map();
    reverseMap.set(/.*/, 'http://example.com')
    let proxy = new Proxy({
      reverse: reverseMap,
    })
  })

  it('should accept a valid reverse proxy map', () => {
    var reverseMap = new Map();
    reverseMap.set(/\/my-path\/.*/, 'http://example2.com')
    reverseMap.set(/.*/, 'http://example.com')
    let proxy = new Proxy({
      reverse: reverseMap,
    })
  })

  it('should reject an empty reverse proxy map', () => {
    var reverseMap = new Map();
    assert.throws(() => {
      let proxy = new Proxy({
        reverse: reverseMap,
      })
    })
  })

  it('should reject a reverse proxy map with no default path', () => {
    var reverseMap = new Map();
    reverseMap.set(/\/my-path\/.*/, 'http://example2.com')
    assert.throws(() => {
      let proxy = new Proxy({
        reverse: reverseMap,
      })
    })
  })

  it('should reject a reverse proxy map without a RegExp path', () => {
    var reverseMap = new Map();
    reverseMap.set("/\/.*/", 'http://example2.com')
    assert.throws(() => {
      let proxy = new Proxy({
        reverse: reverseMap,
      })
    })
  })

  it('should use a reverse proxy map', done => {
    let server1 = http.createServer((req, res) => {
      // console.log(`server1 returning "server1: ${req.url}"`)
      res.end(`server1: ${req.url}`)
    }).listen(0, 'localhost', () => {
      server1.on('error', done)
      let server1Addr = server1.address()

      let server2 = http.createServer((req, res) => {
        // console.log(`server2 returning "server2: ${req.url}"`)
        res.end(`server2: ${req.url}`)
      }).listen(0, 'localhost', () => {
        server2.on('error', done)
        let server2Addr = server2.address()

        var reverseMap = new Map();
        reverseMap.set(/\/server1\/.*/, `http://localhost:${server1Addr.port}`);
        reverseMap.set(/.*/, `http://localhost:${server2Addr.port}`);

        let proxy = new Proxy({
          reverse: reverseMap
        }).listen(0, 'localhost', () => {
          // proxy.intercept('request', function(req) {
          //   req.headers['x-foo'] = 'bar'
          // })
          proxy.on('error', done)
          let proxyAddr = proxy.address()

          http.get(`http://localhost:${proxyAddr.port}/foo`, res => {
            streams.collect(res).then(bod => {
              assert.equal(bod.toString('utf8'), 'server2: /foo')

              http.get(`http://localhost:${proxyAddr.port}/server1/foo`, res2 => {
                streams.collect(res2).then(bod2 => {
                  assert.equal(bod2.toString('utf8'), 'server1: /server1/foo')
                  done()
                }, done)
              })
            })
          })
        })
      })
    })
  })

  it('should honor the order of a reverse proxy map', done => {
    let server1 = http.createServer((req, res) => {
      // console.log(`server1 returning "server1: ${req.url}"`)
      res.end(`server1: ${req.url}`)
    }).listen(0, 'localhost', () => {
      server1.on('error', done)
      let server1Addr = server1.address()

      let server2 = http.createServer((req, res) => {
        // console.log(`server2 returning "server2: ${req.url}"`)
        res.end(`server2: ${req.url}`)
      }).listen(0, 'localhost', () => {
        server2.on('error', done)
        let server2Addr = server2.address()

        var reverseMap = new Map();
        reverseMap.set(/.*/, `http://localhost:${server2Addr.port}`);
        reverseMap.set(/\/server1\/.*/, `http://localhost:${server1Addr.port}`);

        let proxy = new Proxy({
          reverse: reverseMap
        }).listen(0, 'localhost', () => {
          // proxy.intercept('request', function(req) {
          //   req.headers['x-foo'] = 'bar'
          // })
          proxy.on('error', done)
          let proxyAddr = proxy.address()

          http.get(`http://localhost:${proxyAddr.port}/foo`, res => {
            streams.collect(res).then(bod => {
              assert.equal(bod.toString('utf8'), 'server2: /foo')

              http.get(`http://localhost:${proxyAddr.port}/server1/foo`, res2 => {
                streams.collect(res2).then(bod2 => {
                  assert.equal(bod2.toString('utf8'), 'server2: /server1/foo')
                  done()
                }, done)
              })
            })
          })
        })
      })
    })
  })

})
