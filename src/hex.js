/**
 * Isomorphic flat-topped hex grid utils.
 * 
 * Inspired by https://www.redblobgames.com/grids/hexagons/.
 * 
 * Uses axial coordiates (q,r).
 *          _____
 *    _____/ 1,-1\_____
 *   / 0,0 \_____/ 2,-1\
 *   \_____/ 1,0 \_____/
 *   / 0,1 \_____/ 2,0 \
 *   \_____/ 1,1 \_____/
 *         \_____/
 * 
 * Each hex is width x height.
 * 
 *  
 */

import Phaser from 'phaser';

export class Hex {
    q
    r
    constructor(q, r) {
        this.q = q;
        this.r = r;
    }

    add(h) {
        return new Hex(this.q + h.q, this.r + h.r);
    }

    sub(h) {
        return new Hex(this.q - h.q, this.r - h.r);
    }

    get s() {
        return -(this.q + this.r);
    }

    mag() {
        return Math.max(
            Math.abs(this.q),
            Math.abs(this.r),
            Math.abs(this.s),
        );
    }

    dist(h) {
        return this.sub(h).mag();
    }

    key() {
        return `${q},${r}`
    }
}
export class HexGrid {
    width
    height

    xoff
    yoff

    neighborOffsets = [
        new Hex(1, -1),
        new Hex(0, -1),
        new Hex(-1, 0),
        new Hex(-1, 1),
        new Hex(0, 1),
        new Hex(1, 0),
    ]

    constructor(width, height) {
        this.width = width
        this.height = height
    }

    neighbors(hex) {
        return this.neighborOffsets.map((off) => hex + off);
    }

    center(hex) {
        return new Phaser.Geom.Point(
            this.width * hex.q * 3/4.0,
            this.height * (hex.q + hex.r / 2.0),
        )
    }
   
    pointToHex(p) {
        var q = p.x / this.width * 4 / 3.0 
        var r = (y / this.height - q) * 2
        return new Hex(q, r)
    }
}