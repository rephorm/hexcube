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
        return `${this.q},${this.r}`
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
        return this.neighborOffsets.map((off) => hex.add(off));
    }

    center(hex) {
        return [
            this.width * hex.q * 3/4.0,
            this.height * (hex.r + hex.q / 2.0),
        ]
    }
   
    pointToHex(x, y) {
        var q = x / this.width * 4 / 3.0 
        var r = (y / this.height - q/2.0)
        return new Hex(Math.round(q), Math.round(r))
    }
}