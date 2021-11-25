import Phaser from 'phaser';
import hexTileImg from './assets/hex-tile.png'
import cubeImg from './assets/cube-angle.png'
import {Hex, HexGrid} from './hex.js'

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
    tiles = new Map()

    inputDisabled = false

    springEnabled = true
    springConstant = 0.00001;
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
        for (var q = -10; q < 10; q++) {
            for (var r = -30; r < 30; r++) {
                var h = new Hex(q, r)
                if (h.mag() > 10) continue;
                var [x, y] = this.grid.center(h);
                var o = this.add.sprite(x, y-2, 'hextile', h.mag());
                o.setData('hex', h);
                o.setData('vz', 4);
                o.setData('z', 9 + 6 * Math.sin(h.mag() * Math.PI / 4));
                o.setDepth(r*10)
                this.tiles.set(h.key(), o)
                //o.play({key: 'raise', delay: 1000/8.0 * (d+0.5*Math.abs(q))})
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
                name: 'springy',
                springEnabled: true,
                animate: false,
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
        for (let [key, tile] of this.tiles) {
            let hex = tile.getData('hex')
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
        console.log("handle key: ", info.key);
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
            nz += t.getData('z');
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
                    t.setData('z', t.getData('z') - 7)
                }
            }
        })


    }

    update(t, dt) {
        this.updateTileHeights(t, dt)
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
        this.cube.setDepth(hex.r*10 + 2)
        this.shadow.setDepth(hex.r*10 + 1)
       //console.log('q,r:', q, ',', r, 'tz: ', tz, 'pz: ', this.pz, 'tile: ', tile)
    }

    updateSpringForces(h, t, seen) {
        if (seen.has(h.key())) return;
        let z = t.getData('z')
        seen.add(h.key())
        for (let n of this.grid.neighbors(h)) {
            let nt = this.getTile(n);
            if (nt === undefined) continue;
            let dz = z - nt.getData('z')
            let df = -dz * this.springConstant;
            t.setData('force', t.getData('force') + df)
            nt.setData('force', nt.getData('force') - df)
            this.updateSpringForces(n, nt, seen)
        }
    }


    updateTileHeights(t, dt) {
        if (!this.springEnabled) return;
        // Iterate over all neighboring pairs.
        let seen = new Set()

        for (let [k, tile] of this.tiles) {
            let f = 0;
            let h = tile.getData('hex');
            if (this.forcingFunc !== undefined) {
                f = this.forcingFunc(h, t);
            }
            tile.setData('force', f);
        }

        let h0 = new Hex(0, 0);
        this.updateSpringForces(h0, this.getTile(h0), seen);

        // Apply forces.
        for (let [h, t] of this.tiles) {
            let f  = t.getData('force');
            let vz = t.getData('vz');
            let z = t.getData('z');
            vz += f * dt;
            z += vz * dt;
            vz *= this.damping;
            if (z < 0) z = 0;
            if (z > 16) z = 16;
            t.setData('vz', vz);
            t.setData('z', z);
            t.setFrame(Math.round(z));
        }
    }

    getTile(hex) {
        return this.tiles.get(hex.key())
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