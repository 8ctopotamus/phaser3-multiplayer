

const config = {
  type: Phaser.AUTO,
  parent: 'phaser-example',
  width: 800,
  height: 800,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 },
    },
  },
  scene: {
    preload,
    create,
    update
  }
}

const game = new Phaser.Game(config)

function preload() {
  this.load.image('ship', 'assets/spaceShips_001.png')
  this.load.image('otherPlayer', 'assets/enemyBlack5.png')
  this.load.image('star', 'assets/star_gold.png')
}

function create() {
  this.controls = this.input.keyboard.createCursorKeys()
  this.otherPlayers = this.physics.add.group()
  this.socket = io()

  this.socket.on('currentPlayers', players => {
    Object.keys(players).forEach(id => {
      players[id].playerId === this.socket.id
        ? addPlayer(this, players[id])
        : addOtherPlayers(this, players[id])
    })
  })
  
  this.socket.on('newPlayer', player => addOtherPlayers(this, player))
  this.socket.on('disconnect', playerId => {
    this.otherPlayers.getChildren().forEach(oPlayer => {
      playerId === oPlayer.playerId
        oPlayer.destroy()
    })
  })
  
  this.socket.on('playerMoved', player => {
    this.otherPlayers.getChildren().forEach(oPlayer => {
      if (player.playerId === oPlayer.playerId) {
        oPlayer.setRotation(player.rotation)
        oPlayer.setPosition(player.x, player.y)
      }
    })
  })
 
  this.blueScoreText = this.add.text(16, 16, '', { fontSize: '32px', fill: 'blue' })
  this.redScoreText = this.add.text(584, 16, '', { fontSize: '32px', fill: 'red' })

  this.socket.on('scoreUpdate', scores => {
    this.blueScoreText.setText(`Blue: ${scores.blue}`)
    this.redScoreText.setText(`Red: ${scores.red}`)
  })

  this.socket.on('starLocation', starLocation => {
    if (this.star) this.star.destroy()
    this.star = this.physics.add.image(starLocation.x, starLocation.y, 'star')
    this.physics.add.overlap(this.ship, this.star, () => {
      this.socket.emit('starCollected')
    }, null, this)
  })
}

function update() {
  if (this.ship) {
    if (this.controls.left.isDown) {
      this.ship.setAngularVelocity(-150)
    } else if (this.controls.right.isDown) {
      this.ship.setAngularVelocity(150)
    } else {
      this.ship.setAngularVelocity(0)
    }

    if (this.controls.up.isDown) {
      this.physics.velocityFromRotation(this.ship.rotation + 1.5, 100, this.ship.body.acceleration)
    } else {
      this.ship.setAcceleration(0)
    }

    this.physics.world.wrap(this.ship, 5)

    const pos = {
      x: this.ship.x,
      y: this.ship.y,
      rotation: this.ship.rotation
    }

    if (this.ship.oldPosition && (
      pos.x !== this.ship.oldPosition.x || 
      pos.y !== this.ship.oldPosition.y ||
      pos.rotation !== this.ship.oldPosition.rotation 
    )) {    
      this.socket.emit('playerMovement', pos)
    }
    
    // save old position data
    this.ship.oldPosition = pos
  }
}

function addPlayer(game, player) {
  game.ship = game.physics.add.image(player.x, player.y, 'ship')
    .setOrigin(0.5, 0.5)
    .setDisplaySize(53, 40)
  player.team === 'blue'
    ? game.ship.setTint(0x0000ff)
    : game.ship.setTint(0xff0000)
  game.ship.setDrag(100)
  game.ship.setAngularDrag(100)
  game.ship.setMaxVelocity(200)
}

function addOtherPlayers(game, oPlayer) {
  const otherPlayer = game.add.sprite(oPlayer.x, oPlayer.y, 'otherPlayer')
    .setOrigin(0.5, 0.5)
    .setDisplaySize(53, 40)
  oPlayer.team === 'blue'
    ? otherPlayer.setTint(0x0000ff)
    : otherPlayer.setTint(0xff0000)
  otherPlayer.playerId = oPlayer.playerId
  game.otherPlayers.add(otherPlayer)
}