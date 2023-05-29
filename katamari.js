class Utilities
{
    static getElementOffset = (element) => {
        const de = document.documentElement;
        const box = element.getBoundingClientRect();
        const top = box.top + window.pageYOffset - de.clientTop;
        const left = box.left + window.pageXOffset - de.clientLeft;
        return { top, left };
    }

    /**
    * Returns true if the circle intersects the element rectangle.
    * 0  |   1   |   2
    * ------------------
    * 3  |   4   |   5
    * ------------------
    * 6  |   7   |   9
    */
    static circleGridObjInt = (cx, cy, cr, cr2, go) => {
        let dx;
        let dy;
        if (cx < go.left) {
            dx = go.left - cx;
            if (cy < go.top) { /* zone 0. */
                dy = go.top - cy;
                return ((dx * dx + dy * dy) <= cr2);
            } else if (cy <= go.bottom) { /* zone 3. */
                return (dx <= cr);
            } else { /* zone 6. */
                dy = cy - go.bottom;
                return ((dx * dx + dy * dy) <= cr2);
            }
        } else if (cx <= go.right) {
            if (cy < go.top) { /* zone 1. */
                return ((go.top - cy) <= cr);
            } else if (cy <= go.bottom) { /* zone 4. */
                return true;
            } else { /* zone 7. */
                return ((cy - go.bottom) <= cr);
            }
        } else {
            dx = cx - go.right;
            if (cy < go.top) { /* zone 2. */
                dy = go.top - cy;
                return ((dx * dx + dy * dy) <= cr2);
            } else if (cy <= go.bottom) { /* zone 5. */
                return (dx <= cr);
            } else { /* zone 9. */
                dy = cy - go.bottom;
                return ((dx * dx + dy * dy) <= cr2);
            }
        }
    }

    /**
    * Returns [x,y] where the rectangle is closest to (cx, cy).
    * 0  |   1   |   2
    * ------------------
    * 3  |   4   |   5
    * ------------------
    * 6  |   7   |   9
    */
    static getClosestPoint = (cx, cy, go) => {
        if (cx < go.left) {
            if (cy < go.top) { /* zone 0. */
                return [go.left, go.top];
            } else if (cy <= go.bottom) { /* zone 3. */
                return [go.left, cy];
            } else { /* zone 6. */
                return [go.left, go.bottom];
            }
        } else if (cx <= go.right) {
            if (cy < go.top) { /* zone 1. */
                return [cx, go.top];
            } else if (cy <= go.bottom) { /* zone 4. */
                return [cx, cy];
            } else { /* zone 7. */
                return [cx, go.bottom];
            }
        } else {
            if (cy < go.top) { /* zone 2. */
                return [go.right, go.top];
            } else if (cy <= go.bottom) { /* zone 5. */
                return [go.right, cy];
            } else { /* zone 9. */
                return [go.right, go.bottom];
            }
        }
    }

    /**
    * Returns the "volume" of the grid object.
    */
    static gridObjVol = (go) => {
        return go.w * go.h * Math.min(go.w, go.h);
    }
}


class StickyNodes {
    domNodes = [];
    grid = [];
    GRIDX = 100;
    GRIDY = 100;
    REPLACE_WORDS_IN = {
        a: 1, b: 1, big: 1, body: 1, cite: 1, code: 1, dd: 1, div: 1,
        dt: 1, em: 1, font: 1, h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1,
        i: 1, label: 1, legend: 1, li: 1, p: 1, pre: 1, small: 1,
        span: 1, strong: 1, sub: 1, sup: 1, td: 1, th: 1, tt: 1
    };

    addDomNode = (el) => {
        if (el !== undefined && el !== null) {
            el.khIgnore = true;
            el.style.border = BORDER_STYLE;
            this.domNodes.push(el);
        }
    };

    addWords = (el) => {
        let textEls = [];

        const shouldAddChildren = (el) => {
            return el.tagName && this.REPLACE_WORDS_IN[el.tagName.toLowerCase()];
        }

        const buildTextEls = (el, shouldAdd) => {
            let i;
            let len;
            if (shouldAdd && el.nodeType === Node.TEXT_NODE &&
                el.nodeValue.trim().length > 0) {
                textEls.push(el);
                return;
            }
            if (!el.childNodes || el.khIgnore) {
                return;
            }
            shouldAdd = shouldAddChildren(el);
            for (i = 0, len = el.childNodes.length; i < len; i++) {
                buildTextEls(el.childNodes[i], shouldAdd);
            }
        }

        const wordsToSpans = (textEl) => {
            const ws = textEl.nodeValue.split(/\S+/);
            /* preserve whitespace for pre tags. */
            if (ws.length > 0 && ws[0].length === 0) {
                ws.shift();
            }
            
            const p = textEl.parentNode;
            const words = textEl.nodeValue.split(/\s+/);
            let n;
            let len = Math.max(words.length, ws.length);
            for (let i = 0; i < len; i++) {
                if (i < words.length && words[i].length > 0) {
                    n = document.createElement('span');
                    n.innerHTML = words[i];
                    p.insertBefore(n, textEl);
                    this.addDomNode(n);
                }
                if (i < ws.length && ws[i].length > 0) {
                    n = document.createTextNode(ws[i]);
                    p.insertBefore(n, textEl);
                }
            }
            p.removeChild(textEl);
        }

        buildTextEls(el, shouldAddChildren(el));
        textEls.map(wordsToSpans);
    };

    /* includes el. */
    addTagNames = (el, tagNames) => {
        const tname = el.tagName && el.tagName.toLowerCase();
        if (el.khIgnore) {
            return;
        }
        if (tagNames.indexOf(tname) !== -1) {
            this.addDomNode(el);
        }
        if (!el.getElementsByTagName) {
            return;
        }
        for (let i = 0; i < tagNames.length; i++) {
            const els = el.getElementsByTagName(tagNames[i]);
            for (let j = 0, len = els.length; j < len; j++) {
                if (!els[j].khIgnore) {
                    this.addDomNode(els[j]);
                }
            }
        }
    };

    finalize = (docW, docH) => {
        const endXI = Math.floor(docW / this.GRIDX) + 1;
        const endYI = Math.floor(docH / this.GRIDY) + 1;
        /* initialize grid. */
        this.grid = new Array(endXI);
        for (let xi = 0; xi < endXI; xi++) {
            this.grid[xi] = new Array(endYI);
        }
        /* add nodes into grid. */
        for (let i = 0, len = this.domNodes.length; i < len; i++) {
            let el = this.domNodes[i];
            if (el.khPicked) {
                continue;
            }
            let off = Utilities.getElementOffset(el);
            let w = el.offsetWidth;
            let h = el.offsetHeight;
            let go = {
                el: this.domNodes[i], /* dom element. */
                left: off.left,
                right: off.left + w,
                top: off.top,
                bottom: off.top + h,
                w: w,
                h: h,
                x: off.left + (w / 2),    /* center x. */
                y: off.top + (h / 2),    /* center y. */
                diag: Math.sqrt(((w * w) + (h * h)) / 4), /* center to corner */

                /* these are for removing ourselves from the grid. */
                arrays: [], /* which arrays we're in (grid[x][y]). */
                indices: []  /* what indices. */
            };
            const startXI = Math.floor(go.left / this.GRIDX);
            const startYI = Math.floor(go.top / this.GRIDY);
            const endXI = Math.floor((go.left + go.w) / this.GRIDX) + 1;
            const endYI = Math.floor((go.top + go.h) / this.GRIDY) + 1;
            for (let xi = startXI; xi < endXI; xi++) {
                for (let yi = startYI; yi < endYI; yi++) {
                    if (this.grid[xi] === undefined) {
                        this.grid[xi] = [];
                    }
                    if (this.grid[xi][yi] === undefined) {
                        this.grid[xi][yi] = [go];
                    } else {
                        this.grid[xi][yi].push(go);
                    }
                    go.arrays.push(this.grid[xi][yi]);
                    go.indices.push(this.grid[xi][yi].length - 1);
                }
            }
        }
    };

    removeGridObj = (go) => {
        for (let i = 0; i < go.arrays.length; i++) {
            go.arrays[i][go.indices[i]] = undefined;
        }
        go.el.style.visibility = "hidden";
        go.el.khPicked = true;
        delete go.arrays;
        delete go.indices;
    }

    /**
     * cb(gridObj) -> boolean true if the object should be removed.
     */
    removeIntersecting = (x, y, r, cb) => {
        var xi, yi, arr, i, r2 = r * r, go,
            startXI = Math.floor((x - r) / this.GRIDX),
            startYI = Math.floor((y - r) / this.GRIDY),
            endXI = Math.floor((x + r) / this.GRIDX) + 1,
            endYI = Math.floor((y + r) / this.GRIDY) + 1;
        for (xi = startXI; xi < endXI; xi++) {
            if (this.grid[xi] === undefined) {
                continue;
            }
            for (yi = startYI; yi < endYI; yi++) {
                arr = this.grid[xi][yi];
                if (arr === undefined) {
                    continue;
                }
                for (i = 0; i < arr.length; i++) {
                    go = arr[i];
                    if (go !== undefined &&
                        Utilities.circleGridObjInt(x, y, r, r2, go) &&
                        cb(go)) {
                        this.removeGridObj(go);
                    }
                }
            }
        }
    };
}

class PlayerBall {
    constructor(parentNode, stickyNodes, ballOpts) {
        this.stickyNodes = stickyNodes;

        this.canvas_el = document.createElement('canvas');
        this.canvas_el.width = this.radius * 2;
        this.canvas_el.height = this.radius * 2;
        this.canvas_el.style.cssText = 'position: absolute; z-index: 500;';
        parentNode.appendChild(this.canvas_el);
        this.canvas_ctx = this.canvas_el.getContext('2d');

        this.attachedDiv = document.createElement('div');
        parentNode.appendChild(this.attachedDiv);

        this.color = ballOpts.color;
        this.VOL_MULT = ballOpts.VOL_MULT;
        this.MAX_ATTACHED_VISIBLE = ballOpts.MAX_ATTACHED_VISIBLE;
        this.CHECK_VOLS = ballOpts.CHECK_VOLS;
    }

    x = 300;
    y = 300;
    vx = 0;
    vy = 0;
    radius = 20;
    lastR = 0; /**< optimization: only resize when necessary. */
    docW = 10000;
    docH = 10000;

    attached = [];
    attachedDiv; /* div to put this.attached nodes into. */
    canvas_el;
    canvas_ctx;

    accelTargetX = 0;
    accelTargetY = 0;
    accel = false;


    /**
     * which direction the ball is facing in the xy axis, in radians.
     * this.th: 0 is facing dead East
     * this.th: 1/2 PI is facing dead South
     * note that this is like regular this.th on a graph with this.y inverted.
     * Same rotation as css transform.
     */
    th = 0;

    /**
     * Ball angle in the rotation axis / z plane, in radians.
     * this.phi: 0 is pointing in the direction the ball is rolling.
     * this.phi: 1/2 PI is pointing straight up (out of the page).
     * note that forward rotation means this.phi -= 0.1.
     */
    phi = 0;

    setState = (s) => {
        this.x = s.this.x;
        this.y = s.this.y;
        this.vx = s.this.vx;
        this.vy = s.this.vy;
        this.radius = s.this.radius;
        this.th = s.this.th;
        this.phi = s.this.phi;
    };

    setXY = (sx, sy) => {
        this.x = sx;
        this.y = sy;
    };

    setDocSize = (w, h) => {
        this.docW = w;
        this.docH = h;
    };

    setAccel = (bool) => {
        this.accel = bool;
    };

    setAccelTarget = (tx, ty) => {
        this.accelTargetX = tx;
        this.accelTargetY = ty;
    };

    getVol = () => {
        return (4 * Math.PI * this.radius * this.radius * this.radius / 3);
    }

    grow = (go) => {
        var newVol = this.getVol() + Utilities.gridObjVol(go) * this.VOL_MULT;
        this.radius = Math.pow(newVol * 3 / (4 * Math.PI), 1 / 3);
    }

    attachGridObj = (go) => {
        var attXY = Utilities.getClosestPoint(this.x, this.y, go),
            dx = attXY[0] - this.x,
            dy = attXY[1] - this.y,
            r = Math.sqrt(dx * dx + dy * dy),
            attTh = 0 - this.th,
            offLeft = attXY[0] - go.left,
            offTop = attXY[1] - go.top,
            offTh = Math.atan2(dy, dx) - this.th,
            attX = r * Math.cos(offTh),
            attY = r * Math.sin(offTh),
            el = go.el.cloneNode(true),
            newAtt = {
                el: el,
                attX: attX,
                attY: attY,
                attT: 'translate(' + Math.round(attX) + 'px,' +
                    Math.round(attY) + 'px) ' +
                    'rotate(' + attTh + 'rad)',
                r: r,
                offTh: offTh,
                offPhi: 0 - this.phi,
                diag: go.diag,
                removeR: r + go.diag,
                visible: false,
                display: window.getComputedStyle(go.el).getPropertyValue('display')
            };
        this.attached.push(newAtt);
        this.grow(go);
        el.style.position = 'absolute';
        el.style.left = (-offLeft) + 'px';
        el.style.top = (-offTop) + 'px';
        el.style.setProperty(CSS_TRANSFORM_ORIGIN,
            offLeft + 'px ' + offTop + 'px', null);
        el.style.display = 'none';
        /* copy computed styles from old object. */
        el.style.color = window.getComputedStyle(go.el).getPropertyValue('color');
        el.style.textDecoration = window.getComputedStyle(go.el).getPropertyValue('text-decoration');
        el.style.fontSize = window.getComputedStyle(go.el).getPropertyValue('font-size');
        el.style.fontWeight = window.getComputedStyle(go.el).getPropertyValue('font-weight');
        el.khIgnore = true;
        this.attachedDiv.appendChild(el);
    }

    /**
     * @return true if the object should be removed from stickyNodes.
     */
    removeIntCb = (go) => {
        if (this.CHECK_VOLS && Utilities.gridObjVol(go) > this.getVol()) {
            return false;
        }
        this.attachGridObj(go);
        return true;
    }

    updatePhysics = () => {
        var oldX = this.x, oldY = this.y, dx, dy,
            bounce = false,
            accelTh;
        if (this.accel) {
            accelTh = Math.atan2(this.accelTargetY - this.y, this.accelTargetX - this.x);
            this.vx += Math.cos(accelTh) * 0.5;
            this.vy += Math.sin(accelTh) * 0.5;
        } else {
            this.vx *= 0.95;
            this.vy *= 0.95;
        }
        this.x += this.vx;
        this.y += this.vy;
        /* bounce ball on edges of document. */
        if (this.x - this.radius < 0) {
            bounce = true;
            this.x = this.radius + 1;
            this.vx = -this.vx;
        } else if (this.x + this.radius > this.docW) {
            bounce = true;
            this.x = this.docW - this.radius - 1;
            this.vx = -this.vx;
        }
        if (this.y - this.radius < 0) {
            bounce = true;
            this.y = this.radius + 1;
            this.vy = -this.vy;
        } else if (this.y + this.radius > this.docH) {
            bounce = true;
            this.y = this.docH - this.radius - 1;
            this.vy = -this.vy;
        }
        if (this.vx !== 0 || this.vy !== 0) {
            this.th = Math.atan2(this.vy, this.vx);
            dx = this.x - oldX;
            dy = this.y - oldY;
            /* arclen = this.th * r,    so   this.th = arclen / r. */
            this.phi -= Math.sqrt(dx * dx + dy * dy) / this.radius;
        }
        this.stickyNodes.removeIntersecting(this.x, this.y, this.radius, this.removeIntCb);
        this.draw();
    };

    drawBall = () => {
        var sx1, sy1, sx2, sy2, dx, dy, i, pct1, pct2, z1, z2;
        /* move/resize canvas element. */
        this.canvas_el.style.left = (this.x - this.radius) + 'px';
        this.canvas_el.style.top = (this.y - this.radius) + 'px';
        if (this.radius != this.lastR) {
            this.canvas_el.width = 2 * this.radius + 1;
            this.canvas_el.height = 2 * this.radius + 1;
            this.lastR = this.radius;
        }
        /* draw white circle. */
        this.canvas_ctx.clearRect(0, 0, 2 * this.radius, 2 * this.radius);
        this.canvas_ctx.fillStyle = "#3b1b03";
        this.canvas_ctx.beginPath();
        this.canvas_ctx.arc(this.radius, this.radius, this.radius - 1, 0, Math.PI * 2, true);
        this.canvas_ctx.fill();
        /* draw outer border. */
        this.canvas_ctx.strokeStyle = this.color;
        this.canvas_ctx.beginPath();
        this.canvas_ctx.arc(this.radius, this.radius, this.radius - 1, 0, Math.PI * 2, true);
        this.canvas_ctx.stroke();
        /* draw stripes. */
        this.canvas_ctx.fillStyle = this.color;
        sx1 = this.radius + this.radius * Math.cos(this.th + Math.PI / 16);
        sy1 = this.radius + this.radius * Math.sin(this.th + Math.PI / 16);
        sx2 = this.radius + this.radius * Math.cos(this.th - Math.PI / 16);
        sy2 = this.radius + this.radius * Math.sin(this.th - Math.PI / 16);
        dx = (this.radius + this.radius * Math.cos(this.th + Math.PI * 15 / 16)) - sx1;
        dy = (this.radius + this.radius * Math.sin(this.th + Math.PI * 15 / 16)) - sy1;
        for (i = 0; i < Math.PI * 2; i += Math.PI / 7) {
            pct1 = (-Math.cos(this.phi + i) + 1) / 2;
            pct2 = (-Math.cos(this.phi + i + Math.PI / 32) + 1) / 2;
            z1 = Math.sin(this.phi + i);
            z2 = Math.sin(this.phi + i + Math.PI / 32);
            if (z1 > 0 && z2 > 0) {
                this.canvas_ctx.beginPath();
                this.canvas_ctx.moveTo(sx1 + pct1 * dx, sy1 + pct1 * dy);
                this.canvas_ctx.lineTo(sx1 + pct2 * dx, sy1 + pct2 * dy);
                this.canvas_ctx.lineTo(sx2 + pct2 * dx, sy2 + pct2 * dy);
                this.canvas_ctx.lineTo(sx2 + pct1 * dx, sy2 + pct1 * dy);
                this.canvas_ctx.fill();
            }
        }
    }

    /**
     * @return true if the this.attached object is roughly visible.
     */
    drawAttached = (att) => {
        var oth = this.th + att.offTh,
            ophi = this.phi + att.offPhi,
            ox = att.r * Math.cos(oth),
            oy = att.r * Math.sin(oth),
            dx = (att.r * Math.cos((this.th - att.offTh) + Math.PI)) - ox,
            dy = (att.r * Math.sin((this.th - att.offTh) + Math.PI)) - oy,
            pct = (-Math.cos(ophi) + 1) / 2,
            cx = ox + pct * dx,
            cy = oy + pct * dy,
            oz = att.r * Math.sin(ophi);
        if (oz < 0 && Math.sqrt(cx * cx + cy * cy) + att.diag < this.radius) {
            /* hidden behind circle. */
            if (att.visible) {
                att.visible = false;
                att.el.style.display = "none";
            }
            return false;
        }
        /* this.attached node is visible. */
        if (!att.visible) {
            att.visible = true;
            att.el.style.display = att.display;
        }
        //att.el.style.zIndex = 500 + Math.round(oz);
        att.el.style.zIndex = (oz > 0) ? 501 : 499;
        att.el.style.setProperty(
            CSS_TRANSFORM,
            'translate(' + this.x + 'px,' + this.y + 'px) ' +
            'rotate(' + this.th + 'rad) ' +
            'scaleX(' + Math.cos(ophi) + ') ' +
            att.attT, null);
        return true;
    }

    onAttachedRemoved = (att) => {
        this.attachedDiv.removeChild(att.el);
        delete att.el;
    }

    draw = () => {
        var i, att, numAttachedVisible = 0;
        this.drawBall();
        for (i = this.attached.length; --i >= 0;) {
            att = this.attached[i];
            if (att.removeR < this.radius) {
                this.attached.splice(i, 1).map(this.onAttachedRemoved);
            } else if (this.drawAttached(att)) {
                if (++numAttachedVisible > this.MAX_ATTACHED_VISIBLE) {
                    /* remove older items and stop. */
                    this.attached.splice(0, i).map(this.onAttachedRemoved);
                    break;
                }
            }
        }
    };
}

const preventDefault = (event) => {
    event.preventDefault();
    event.returnValue = false;
    return false;
}

class Game {
    constructor(gameDiv, stickyNodes, ballOpts) {
        this.stickyNodes = stickyNodes;

        var player1, physicsInterval, resizeInterval;
        player1 = new PlayerBall(gameDiv, stickyNodes, ballOpts);
        player1.setXY(document.body.scrollLeft + 300, document.documentElement.scrollTop + 300);

        const on_resize = () => {
            player1.setDocSize(window.innerWidth - 5,
                window.innerHeight - 5);
        };
        on_resize();

        /* touch events - always on? */
        document.addEventListener('touchstart', function (event) {
            if (event.touches.length === 1) {
                player1.setAccel(true);
                return preventDefault(event);
            }
        }, true);
        document.addEventListener('touchmove', function (event) {
            player1.setAccelTarget(event.touches[0].pageX,
                event.touches[0].pageY);
        }, true);
        document.addEventListener('touchend', function (event) {
            if (event.touches.length === 0) {
                player1.setAccel(false);
                return preventDefault(event);
            }
        }, true);

        /* mouse buttons */
        document.addEventListener('mousemove', function (event) {
            player1.setAccelTarget(event.pageX, event.pageY);
        }, true);
        document.addEventListener('mousedown', function (event) {
            if (event.button === 0 || event.button === 2) {
                player1.setAccel(true);
                return preventDefault(event);
            }
        }, true);
        document.addEventListener('mouseup', function (event) {
            if (event.button === 0 || event.button === 2) {
                player1.setAccel(false);
                return preventDefault(event);
            }
        }, true);

        document.addEventListener('click', function (event) {
            if (event.button === 0) {
                return preventDefault(event);
            }
        }, true);
        document.addEventListener('contextmenu', preventDefault, true);

        physicsInterval = setInterval(function () {
            player1.updatePhysics();
        }, 25);
        resizeInterval = setInterval(on_resize, 1000);
    }
}

const whenAllLoaded = (gameDiv, stickyNodes) => {
    stickyNodes.finalize(window.innerWidth, window.innerHeight);

    var game, ballOpts;
    ballOpts = {
        color: "#e27a2d",
        VOL_MULT: 0.5,
        MAX_ATTACHED_VISIBLE: 10000,
        CHECK_VOLS: true
    };
    game = new Game(gameDiv, stickyNodes, ballOpts);
}

const main = () => {
    var gameDiv;

    gameDiv = document.createElement('div');
    gameDiv.khIgnore = true;
    document.body.appendChild(gameDiv);

    setTimeout(function () {
        var i, len, el;
        window.khNodes.addWords(document.body);
        for (i = 0, len = document.body.childNodes.length; i < len; i++) {
            el = document.body.childNodes[i];
            window.khNodes.addTagNames(el, [
                'button', 'canvas', 'iframe', 'img', 'input', 'select',
                'textarea'
            ]);
        }

        whenAllLoaded(gameDiv, window.khNodes);
    }, 0);
}

const BORDER_STYLE = "";
const POSSIBLE_TRANSFORM_PREFIXES = ['-webkit-', '-moz-', '-o-', '-ms-', ''];
const findCSSPrefixes = () => {
    var i, d = document.createElement('div'), pre;
    for (i = 0; i < POSSIBLE_TRANSFORM_PREFIXES.length; i++) {
        pre = POSSIBLE_TRANSFORM_PREFIXES[i];
        d.style.setProperty(pre + 'transform', 'rotate(1rad) scaleX(2)', null);
        if (d.style.getPropertyValue(pre + 'transform')) {
            return [pre + 'transform', pre + 'transform-origin'];
        }
    }
    alert("Your browser doesn't support CSS tranforms!");
    throw "Your browser doesn't support CSS tranforms!";
};

const [CSS_TRANSFORM, CSS_TRANSFORM_ORIGIN] = findCSSPrefixes();

if (!window.khNodes) {
    window.khNodes = new StickyNodes();
}

let konamiCodePosition = 0;
const konamiCodeHandler = (event) => {
    const konamiCode = ["UP", "UP", "DOWN", "DOWN", "LEFT", "RIGHT", "LEFT", "RIGHT", "B", "A"];
    const key = event.key.replace("Arrow", "").toUpperCase();
    console.log(key);
    if (key !== konamiCode[konamiCodePosition]) {
        konamiCodePosition = 0;
        return;
    }
    konamiCodePosition++;
    if (konamiCodePosition === konamiCode.length) {
        main();
        document.removeEventListener('keydown', konamiCodeHandler, true);
    }
};

document.addEventListener('keydown', konamiCodeHandler, true);

main();