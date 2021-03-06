import Phaser from 'phaser';
import hexTileImg from './assets/hex-tile.png'
import cubeImg from './assets/cube-angle.png'
import {Hex, HexGrid} from './hex.js'

class Tile extends Phaser.GameObjects.Sprite {
    hex
    z
    vz
    force
    prevForce

    constructor(scene, grid, hex) {
        let [x, y] = grid.center(hex);
        console.log(x, y)
        super(scene, x, y, 'hextile');
        scene.add.existing(this);
        this.hex = hex;

        this.z = 8
        this.vz = 0
        this.force = 0
        this.prevForce = 0

        this.setDepth(hex.r*10 + hex.q)
        this.setFrame(this.z);
    }
}

class Main extends Phaser.Scene
{
    cube
    shadow
    px = 0
    py = 0
    pz = 0
    pq = 0
    ps = 0

    cx = 0
    cy = 0

    grid = new HexGrid(32, 16)
    maxSize = 30
    //tiles = new Map()
    tiles = new Array(200*200);

    inputDisabled = false

    springEnabled = true
    springConstant = 0.00004;
    damping = 0.97;
    forcingFunc

    mode = 0
    modeText

    constructor ()
    {
        super();
    }

    preload ()
    {
        this.load.spritesheet('hextile', hexTileImg, {
            frameWidth: 33,
            frameHeight: 33,
        })
        this.load.spritesheet('cube', cubeImg, {
            frameWidth: 32,
            frameHeight: 32,
        })
    }
      
    create()
    {
        this.cameras.main.centerOn(0, 0)
        var frames = this.anims.generateFrameNumbers('hextile', {start: 0, end: 16})
        //this.anims.generateFrameNumbers('hextile', {start: 16, end: 1, outputArray: frames});
        this.anims.create({
            key: 'raise',
            frames: frames,
            frameRate: 16,
            repeat: -1,
            yoyo: 1,
        });
        this.anims.create({
            key: 'up-right',
            frames: this.anims.generateFrameNumbers('cube', {start: 0, end: 5}),
            frameRate: 8,
            repeat: -1,

        })
        this.anims.create({
            key: 'up-left',
            frames: this.anims.generateFrameNumbers('cube', {start: 6, end: 11}),
            frameRate: 8,
            repeat: -1,
        })
        this.anims.create({
            key: 'down-right',
            frames: this.anims.generateFrameNumbers('cube', {start: 12, end: 17}),
            frameRate: 8,
            repeat: -1,
        })
        this.anims.create({
            key: 'down-left',
            frames: this.anims.generateFrameNumbers('cube', {start: 18, end: 23}),
            frameRate: 8,
            repeat: -1,
        })
        this.anims.create({
            key: 'up',
            frames: this.anims.generateFrameNumbers('cube', {start: 24, end: 29}),
            frameRate: 8,
            repeat: -1,
        })
        this.anims.create({
            key: 'down',
            frames: this.anims.generateFrameNumbers('cube', {start: 30, end: 35}),
            frameRate: 8,
            repeat: -1,
        })
        for (var q = -this.maxSize; q <= this.maxSize; q++) {
            for (var r = -this.maxSize; r <= this.maxSize; r++) {
                var h = new Hex(q, r)
                if (h.mag() > this.maxSize) continue;
                this.addTile(h, false)
            }
        }

        this.px = 0
        this.py = 0
        this.pz = 0
        this.cube = this.add.sprite(this.px, this.py + this.pz, 'cube', 0);
        this.cube.play('up-right');
        this.cube.setDepth(100)

        this.modeText = this.add.text(-this.scale.width/2, -this.scale.height/2, "Mode: 0", {color: '#333'})
        this.modeText.setDepth(1000)

        this.setupInput()
        this.setMode(0)

        this.cameras.main.startFollow(this.cube, false, 0.05)
    }

    setupInput() {
        var keys = [
            {key: 'D', anim: 'down-right', dh: new Hex(1, 0)},
            {key: 'S', anim: 'down', dh: new Hex(0, 1)},
            {key: 'A', anim: 'down-left', dh: new Hex(-1, 1)},
            {key: 'Q', anim: 'up-left', dh: new Hex(-1, 0)},
            {key: 'W', anim: 'up', dh: new Hex(0, -1)},
            {key: 'E', anim: 'up-right', dh: new Hex(1, -1)},
        ];
        for (let info of keys) {
            this.input.keyboard.on('keydown-'+info.key, ()=>{
                this.handleMove(info)
            })
        }
        this.input.on('pointerup', (e) => {
            var swipeTime = e.upTime - e.downTime;
            var swipe = new Phaser.Geom.Point(e.upX - e.downX, e.upY - e.downY);
            var swipeMagnitude = Phaser.Geom.Point.GetMagnitude(swipe);
            var swipeNormal = new Phaser.Math.Vector2(swipe.x / swipeMagnitude, swipe.y / swipeMagnitude);
            var angle = swipeNormal.angle()
            var dir = Math.floor(angle / Math.PI * 3)
            if (swipeMagnitude > 20 && swipeTime < 1000 && (Math.abs(swipeNormal.y) > 0.8 || Math.abs(swipeNormal.x) > 0.8)) {
                this.handleMove(keys[dir])
            }
        })

        this.input.keyboard.on('keydown-M', this.nextMode, this)
        this.modeText.setInteractive()
        this.modeText.on('pointerup', this.nextMode, this)
        console.log(this.tiles)

        this.shadow = this.add.ellipse(this.px, this.py + 2, 16, 8, 0x444444, 0.5)
        this.shadow.setDepth(99)
    }

    nextMode() {
      this.setMode((this.mode + 1) % 3)
    }

    setMode(mode) {
        let modes = [
            {
                name: 'springy',
                springEnabled: true,
                animate: false,
            },
            {
                name: 'wavy',
                springEnabled: true,
                animate: false,
                forcingFunc: (hex, t) => {
                    return Math.sin(Math.PI * (t / 500 + hex.q / 8))  * 0.0002
                    //return hex.mag() * Math.sin(Math.PI * (t/500 + (hex.mag() + 0.5 * Math.abs(hex.q))/5)) * 0.00002
                }
            },
            {
                name: 'radial',
                springEnabled: true,
                animate: false,
                forcingFunc: (hex, t) => {
                    return Math.sin(Math.PI * (t / 500 + hex.mag() / 8))  * 0.0002
                }
            },
            {
                name: 'pulse',
                springEnabled: false,
                animate: true,
                delay: (hex) => {
                   return 1000 / 8.0 * (hex.mag() + 0.5 * Math.abs(hex.q))
                },
            },
        ]
        this.mode = mode
        let info = modes[this.mode]
        this.springEnabled = info.springEnabled
        this.forcingFunc = info.forcingFunc
        for (let tile of this.tiles) {
            if (tile == undefined) continue;
            let hex = tile.hex;
            if (info.animate) {
                tile.playAfterDelay('raise', info.delay(hex))
            } else {
                tile.stop()
            }
        }

        this.modeText.text = `Mode: ${info.name}`
    }
    handleMove(info) {
        if (this.inputDisabled) return
        this.inputDisabled = true
        var duration = 50
        this.cube.play(info.anim);
        let ohex = this.grid.pointToHex(this.px, this.py);
        let nhex = ohex.add(info.dh);
        let [nx, ny] = this.grid.center(nhex)
        this.tweens.add({
            targets: this,
            duration: duration,
            ease: 'Sine',
            px: nx,
            py: ny,
        })
        let nz = 0;
        let t = this.getTile(nhex);
        if (t !== undefined) {
            nz += t.z;
        }

        this.tweens.add({
            targets: this,
            duration: duration,
            pz: nz + 10,
            yoyo: true,
            ease: 'Sine',
            onComplete: () => {
                this.inputDisabled = false;
                if (t !== undefined && this.springEnabled) {
                    t.z -= 7
                }
            }
        })

        this.updateMap(nhex);
    }

    updateMap(hex) {
        let toDelete = [] // list of hexes
        let toAdd = [] // list of hexes

        // TODO(rephorm): Fix this to dfs out from hex and add all tiles out to maxSize.
        // The current form assumes some tile is present, which isn't necessarily the case.
        for (let tile of this.tiles) {
            if (tile === undefined) continue;
            let ohex = tile.hex;
            if (hex.dist(ohex) > this.maxSize) {
                toDelete.push(ohex)
            } else {
                for (let nhex of this.grid.neighbors(ohex)) {
                    if (this.getTile(nhex) === undefined && hex.dist(nhex) <= this.maxSize) {
                        toAdd.push(nhex)
                    }
                }
            }
        }

        for (let hex of toDelete) {
            this.deleteTile(hex)
        }

        for (let nhex of toAdd) {
            this.addTile(nhex, true)
        }
    }

    deleteTile(hex) {
        let i = this.tileIndex(hex);
        if (i < 0 || i >= this.tiles.length) return;
        var tile = this.tiles[i];
        if (tile === undefined) return;
        //console.log("delete", hex.key())
        this.tiles[i] = undefined;
        tile.destroy();
    }

    addTile(hex) {
        let i = this.tileIndex(hex);
        if (i < 0 || i >= this.tiles.length) return;
        if (this.tiles[i] !== undefined) return;
        //console.log("add", hex.key(), i)
        let tile = new Tile(this, this.grid, hex);
        this.tiles[i] = tile
    }

    update(t, dt) {
        this.updateTileHeights(t, dt);
        let hex = this.grid.pointToHex(this.px, this.py);
        let tile = this.getTile(hex)
        var tz = 0
        if (tile !== undefined) {
            tz = tile.frame.name
        }
        if (this.pz < tz) {
            this.pz = tz
        }
        if (this.pz > tz) {
            this.pz -= 1
        }

        this.cube.x = this.px
        this.cube.y = this.py - this.pz
        this.shadow.x = this.px - 1
        this.shadow.y = this.py + 4 - tz
        this.shadow.scale = (30 - (this.pz - tz)) / 30.0
        this.cube.setDepth(hex.r*10  + hex.q + 2)
        this.shadow.setDepth(hex.r*10 + hex.q + 1)
       //console.log('q,r:', q, ',', r, 'tz: ', tz, 'pz: ', this.pz, 'tile: ', tile)
    }

    updateSpringForces(from) {
        this.dfsPairs(from, (t, nt) => {
                let df = (nt.z - t.z) * this.springConstant;
                t.force += df;
                nt.force -= df;
        })
    }

    dfsPairs(fromTile, callback) {
        let seen = new Array(this.tiles.length);
        let helper = (tile) => {
            let i = this.tileIndex(tile.hex);
            if(i < 0 || i > seen.length || seen[i]) return;
            seen[i] = true;
            for (let nHex of this.grid.neighbors(tile.hex)) {
                let nTile = this.getTile(nHex);
                if (nTile === undefined) continue
                let ni = this.tileIndex(nHex);
                if (i < ni) {
                    callback(tile, nTile);
                }
                helper(nTile);
            }
        }
        helper(fromTile);
    }

    updateTileHeights(t, dt) {
        if (!this.springEnabled) return;
        // Iterate over all neighboring pairs.
        var first;

        for (let tile of this.tiles) {
            if (tile === undefined) continue;
            if (first === undefined) first = tile;
             tile.prevForce = tile.force
          
            tile.z += (tile.vz * dt + 0.5 * tile.prevForce * dt * dt);
            tile.z = Phaser.Math.Clamp(tile.z, 0, 16);
            let frame = Math.round(tile.z);
            tile.setFrame(frame);

            // Calculate new position dependent force.
            let f = 0;
            f += this.springConstant * (7 - tile.z) / 4;
            if (this.forcingFunc !== undefined) {
                f = this.forcingFunc(tile.hex, t);
            }
            tile.force = f;
        }

        // DFS to calculate spring forces.
        let t0 = performance.now()
        let seen = new Array(this.tiles.length)
        this.updateSpringForces(first, seen);
        //console.log('DFS took', performance.now() - t0, 'ms');

        // Update velocity
        for (let tile of this.tiles) {
            if (tile === undefined) continue;
            tile.vz += 0.5 * (tile.force + tile.prevForce) * dt;
            tile.vz *= this.damping;
        }
    }

    tileIndex(hex) {
        if (hex.q < -100 || hex.q >= 100 ||
            hex.r < -100 || hex.r >= 100) {
            return -1;
        }
        return (hex.q + 100) * 200 + hex.r + 100; 
    }

    getTile(hex) {
        let i = this.tileIndex(hex);
        if (i < 0 || i >= this.tiles.length) {
            return undefined;
        }
        return this.tiles[i];
    }
}

const config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: 800,
    height: 600,
    scene: [
        Main,
    ],
    physics: {
        default: 'arcade',
        arcade: {
            debug: true,
        },
    },
    backgroundColor: 0xffffee,
};

const game = new Phaser.Game(config)