import Phaser from 'phaser';
import hexTilesImg from './assets/hex_tiles.png'
import cubeImg from './assets/cube-angle.png'

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

    tiles = new Map()

    inputDisabled = false

    constructor ()
    {
        super();
    }

    preload ()
    {
        this.load.spritesheet('hextiles', hexTilesImg, {
            frameWidth: 32,
            frameHeight: 32,
        })
        this.load.spritesheet('cube', cubeImg, {
            frameWidth: 32,
            frameHeight: 32,
        })
    }
      
    create ()
    {
        let frames = this.anims.generateFrameNumbers('hextiles', {start: 0, end: 13})
        this.anims.generateFrameNumbers('hextiles', {start: 12, end: 1, outputArray: frames})
        this.anims.create({
            key: 'raise',
            frames: frames,
            frameRate: 16,
            repeat: -1
        });
        this.anims.create({
            key: 'up-right',
            frames: this.anims.generateFrameNumbers('cube', {start: 0, end: 5}),
            frameRate: 8,
            repeat: -1,
            bounce: 1,

        })
        this.anims.create({
            key: 'up-left',
            frames: this.anims.generateFrameNumbers('cube', {start: 6, end: 11}),
            frameRate: 8,
            repeat: -1,
            bounce: 1,
        })
        this.anims.create({
            key: 'down-right',
            frames: this.anims.generateFrameNumbers('cube', {start: 12, end: 17}),
            frameRate: 8,
            repeat: -1,
            bounce: 1,
        })
        this.anims.create({
            key: 'down-left',
            frames: this.anims.generateFrameNumbers('cube', {start: 18, end: 23}),
            frameRate: 8,
            repeat: -1,
            bounce: 1,
        })
        this.anims.create({
            key: 'up',
            frames: this.anims.generateFrameNumbers('cube', {start: 24, end: 29}),
            frameRate: 8,
            repeat: -1,
            bounce: 1,
        })
        this.anims.create({
            key: 'down',
            frames: this.anims.generateFrameNumbers('cube', {start: 30, end: 35}),
            frameRate: 8,
            repeat: -1,
            bounce: 1,
        })
        var cx = this.scale.width / 2
        var cy = this.scale.height / 2
        this.cx = cx
        this.cy = cy
        for (var q = -10; q < 10; q++) {
            for (var r = -30; r < 30; r++) {
                var s = -(q + r);
                var d = Math.max(Math.abs(q), Math.abs(r), Math.abs(s))
                if (d > 10) continue;
                var x = cx + 24 * q ;
                var y = cy + 15 * r + 8*q;
                var frame = Phaser.Math.Between(0, 14)
                frame = 0
                var o = this.add.sprite(x, y, 'hextiles', Math.floor(frame))
                this.tiles.set(`${q},${r}`, o)
                o.setDepth(r*10)
                o.play({key: 'raise', delay: 1000/8.0 * (d+0.5*Math.abs(q))})
            }
        }

        this.px = cx
        this.py = cy
        this.pz = 0
        this.cube = this.add.sprite(this.px, this.py + this.pz, 'cube', 0);
        this.cube.play('up-right');
        this.cube.setDepth(100)

        this.handleKeys()
    }

    handleKeys() {
        var keys = [
            {key: 'W', anim: 'up', move: {dx: 0, dy: -15}},
            {key: 'Q', anim: 'up-left', move: {dx: -24, dy: -8}},
            {key: 'E', anim: 'up-right', move: {dx: 24, dy: -7}},
            {key: 'S', anim: 'down', move: {dx: 0, dy: 15}},
            {key: 'A', anim: 'down-left', move: {dx: -24, dy: 7}},
            {key: 'D', anim: 'down-right', move: {dx: 24, dy: 8}},
        ];
        for (let info of keys) {
            this.input.keyboard.on('keydown-'+info.key, ()=>{
                if (this.inputDisabled) return
                console.log("handle key: ", info.key);
                this.inputDisabled = true
                var duration = 50
                this.cube.play(info.anim);
                this.tweens.add({
                    targets: this,
                    duration: duration,
                    ease: 'Sine',
                    px: this.px + info.move.dx,
                    py: this.py + info.move.dy,
                })
                this.tweens.add({
                    targets: this,
                    duration: duration,
                    pz: this.pz + 10,
                    yoyo: true,
                    ease: 'Sine',
                    onComplete: () => {
                        console.log("enable input");
                        this.inputDisabled = false;
                    } 
                })
            })
        }
        console.log(this.tiles)

        this.shadow = this.add.ellipse(this.px, this.py + 2, 16, 8, 0x444444, 0.5)
        this.shadow.setDepth(99)
    }

    update(dt) {
        let [q, r] = this.pixel_to_hex(this.px, this.py);
        let tile = this.get_tile(q, r)
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
        this.shadow.scale = (30 - this.pz) / 30.0
        this.cube.setDepth(r*10 + 2)
        this.shadow.setDepth(r*10 + 1)
       //console.log('q,r:', q, ',', r, 'tz: ', tz, 'pz: ', this.pz, 'tile: ', tile)
    }

    pixel_to_hex(x, y) {
        var dx = x - this.cx
        var dy = y - this.cy
        var q = Math.round(dx / 24)
        var r = Math.round((dy - 8 * q) / 15)
        return [q,r]
    }

    get_tile(q, r) {
        return this.tiles.get(`${q},${r}`)
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

const game = new Phaser.Game(config);
