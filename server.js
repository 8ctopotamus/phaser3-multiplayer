const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io').listen(server)

const PORT = process.env.PORT || 8080

app.use(express.static(`${__dirname}/public`))

app.get('/', (req, res) => res.sendFile(`${__dirname}/index.html`))

server.listen(PORT, () => console.log(`Server listening at http://localhost:${PORT}`))

const players = {}
const star = {
  x: Math.floor(Math.random() * 700) + 50,
  y: Math.floor(Math.random() * 500) + 50,
}
const scores = {
  blue: 0,
  red: 0
}

io.on('connection', socket => {
  console.log(`${socket.id} connected`)
  players[socket.id] = {
    rotation: 0,
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50,
    playerId: socket.id,
    team: (Math.floor(Math.random() * 2) == 0 ? 'red' : 'blue'),
  }
  // send players obj to the new player
  socket.emit('currentPlayers', players)
  // send the star object to the new player
  socket.emit('starLocation', star)
  // send the current scores
  socket.emit('scoreUpdate', scores)
  // update all other players with new player
  socket.broadcast.emit('newPlayer', players[socket.id])
  // disconnect
  socket.on('disconnect', () => {
    console.log(`${socket.id} disconnected`)
    delete players[socket.id]
    io.emit('disconnect', socket.id)
  })
  // when a player moves, update the player data
  socket.on('playerMovement', data => {
    const p = players[socket.id]
    p.x = data.x
    p.y = data.y
    p.rotation = data.rotation
    // emit message to all player about the player that moved
    socket.broadcast.emit('playerMoved', p)
  })

  socket.on('starCollected', () => {
    console.log(players[socket.id].team + 'collected star')
    scores[players[socket.id].team] += 10
    star.x = Math.floor(Math.random() * 700) + 50
    star.y = Math.floor(Math.random() * 500) + 50
    io.emit('starLocation', star)
    io.emit('scoreUpdate', scores)
  })
})
