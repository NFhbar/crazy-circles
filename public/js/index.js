// ===========================
// ancillary geometric classes
// ===========================
var Point = function (x, y)
{
    this.x = x;
    this.y = y;
}

Point.prototype = {
    dist: function (p) { return this.vect(p).norm(); },
    vect: function (p) { return new Point (p.x-this.x, p.y-this.y); },
    norm: function (p) { return Math.sqrt (this.x*this.x+this.y*this.y);},
    add : function (v) { return new Point (this.x + v.x, this.y + v.y);},
    mult: function (a) { return new Point (this.x * a, this.y * a);}
};
var Circle = function (radius, center)
{
    this.r = radius;
    this.c = center;
};

Circle.prototype = {
    surface:  function () { return Math.PI * this.r * this.r; },
    distance: function (circle) { return this.c.dist(circle.c) - this.r - circle.r; }
};


// =========================
// circle packer lives here!
// =========================
var Packer = function (circles, ratio)
{
    this.circles = circles;
    this.ratio   = ratio || 1;
    this.list = this.solve();
}

Packer.prototype = {
    // try to fit all circles into a rectangle of a given surface
    compute: function (surface)
    {
        // check if a circle is inside our rectangle
        function in_rect (radius, center)
        {
            if (center.x - radius < - w/2) return false;
            if (center.x + radius >   w/2) return false;
            if (center.y - radius < - h/2) return false;
            if (center.y + radius >   h/2) return false;
            return true;
        }

        // approximate a segment with an "infinite" radius circle
        function bounding_circle (x0, y0, x1, y1)
        {
            var xm = Math.abs ((x1-x0)*w);
            var ym = Math.abs ((y1-y0)*h);
            var m = xm > ym ? xm : ym;
            var theta = Math.asin(m/4/bounding_r);
            var r = bounding_r * Math.cos (theta);
            return new Circle (bounding_r,
                new Point (r*(y0-y1)/2+(x0+x1)*w/4,
                           r*(x1-x0)/2+(y0+y1)*h/4));
        }

        // return the corner placements for two circles
        function corner (radius, c1, c2)
        {
            var u = c1.c.vect(c2.c); // c1 to c2 vector
            var A = u.norm();
            if (A == 0) return [] // same centers
            u = u.mult(1/A); // c1 to c2 unary vector
            // compute c1 and c2 intersection coordinates in (u,v) base
            var B = c1.r+radius;
            var C = c2.r+radius;
            if (A > (B + C)) return []; // too far apart
            var x = (A + (B*B-C*C)/A)/2;
            var y = Math.sqrt (B*B - x*x);
            var base = c1.c.add (u.mult(x));

            var res = [];
            var p1 = new Point (base.x -u.y * y, base.y + u.x * y);
            var p2 = new Point (base.x +u.y * y, base.y - u.x * y);
            if (in_rect(radius, p1)) res.push(new Circle (radius, p1));
            if (in_rect(radius, p2)) res.push(new Circle (radius, p2));
            return res;
        }

        /////////////////////////////////////////////////////////////////

        // deduce starting dimensions from surface
        var bounding_r = Math.sqrt(surface) * 100; // "infinite" radius
        var w = this.w = Math.sqrt (surface * this.ratio);
        var h = this.h = this.w/this.ratio;

        // place our bounding circles
        var placed=[
            bounding_circle ( 1,  1,  1, -1),
            bounding_circle ( 1, -1, -1, -1),
            bounding_circle (-1, -1, -1,  1),
            bounding_circle (-1,  1,  1,  1)];

        // Initialize our rectangles list
        var unplaced = this.circles.slice(0); // clones the array
        while (unplaced.length > 0)
        {
            // compute all possible placements of the unplaced circles
            var lambda = {};
            var circle = {};
            for (var i = 0 ; i != unplaced.length ; i++)
            {
                var lambda_min = 1e10;
                lambda[i] = -1e10;
                // match current circle against all possible pairs of placed circles
                for (var j = 0   ; j < placed.length ; j++)
                for (var k = j+1 ; k < placed.length ; k++)
                {
                    // find corner placement
                    if (k > 3) {
                    zog=1;
                    }
                    var corners = corner (unplaced[i], placed[j], placed[k]);

                    // check each placement
                    for (var c = 0 ; c != corners.length ; c++)
                    {
                        // check for overlap and compute min distance
                        var d_min = 1e10;
                        for (var l = 0 ; l != placed.length ; l++)
                        {
                            // skip the two circles used for the placement
                            if (l==j || l==k) continue;

                            // compute distance from current circle
                            var d = placed[l].distance (corners[c]);
                            if (d < 0) break; // circles overlap

                            if (d < d_min) d_min = d;
                        }
                        if (l == placed.length) // no overlap
                        {
                            if (d_min < lambda_min)
                            {
                                lambda_min = d_min;
                                lambda[i] = 1- d_min/unplaced[i];
                                circle[i] = corners[c];
                            }
                        }
                    }
                }
            }

            // select the circle with maximal gain
            var lambda_max = -1e10;
            var i_max = -1;
            for (var i = 0 ; i != unplaced.length ; i++)
            {
                if (lambda[i] > lambda_max)
                {
                    lambda_max = lambda[i];
                    i_max = i;
                }
            }

            // failure if no circle fits
            if (i_max == -1) break;

            // place the selected circle
            unplaced.splice(i_max,1);
            placed.push (circle[i_max]);
        }

        // return all placed circles except the four bounding circles
        this.tmp_bounds = placed.splice (0, 4);
        return placed;
    },

    // find the smallest rectangle to fit all circles
    solve: function ()
    {
        // compute total surface of the circles
        var surface = 0;
        for (var i = 0 ; i != this.circles.length ; i++)
        {
            surface += Math.PI * Math.pow(this.circles[i],2);
        }

        // set a suitable precision
        var limit = surface/1000;

        var step = surface/2;
        var res = [];
        while (step > limit)
        {
            var placement = this.compute.call (this, surface);
console.log ("placed",placement.length,"out of",this.circles.length,"for surface", surface);
            if (placement.length != this.circles.length)
            {
                surface += step;
            }
            else
            {
                res = placement;
                this.bounds = this.tmp_bounds;
                surface -= step;
            }
            step /= 2;
        }
        return res;
    }
};

// ====
// demo
// ====
function draw_result (packer)
{
    function draw_circle (circle)
    {
        ctx.beginPath();
        ctx.arc ((circle.c.x+dx)*zoom+mx, (circle.c.y+dy)*zoom+my, circle.r*zoom, 0, 2*Math.PI);
        ctx.closePath();
        ctx.stroke();
    }

    var canvas = document.getElementById ('canvas');
    var ctx = canvas.getContext("2d");
    canvas.width +=0; // clear canvas
    var margin_factor = 0.1;

    var mx = canvas.width * margin_factor / 2;
    var my = canvas.height* margin_factor / 2;
    var dx = packer.w/2;
    var dy = packer.h/2;
    var zx = canvas.width  * (1-margin_factor) / packer.w;
    var zy = canvas.height * (1-margin_factor) / packer.h;
    var zoom = zx < zy ? zx : zy;

    // draw all circles
    ctx.strokeStyle = 'black';
    for (var i = 0 ; i != packer.list.length ; i++)
        draw_circle (packer.list[i]);

    // draw bounding circles
    ctx.strokeStyle = 'red';
    for (var i = 0 ; i != packer.bounds.length ; i++)
        draw_circle (packer.bounds[i]);

    // draw rectangle
    ctx.strokeStyle = 'orange';
    ctx.beginPath();
    ctx.rect((-packer.w/2+dx)*zoom+mx, (-packer.h/2+dy)*zoom+my, packer.w*zoom, packer.h*zoom);
    ctx.closePath();
    ctx.stroke();
}

function draw ()
{
    var circles = parseInt  (document.getElementById('c').value);
    var ratio   = parseFloat(document.getElementById('r').value);
    var min_r   = parseInt  (document.getElementById('a').value);
    var max_r   = parseInt  (document.getElementById('b').value);
    var radiuses = [];
    for (var i = 0 ; i != circles ; i++)
        radiuses.push (Math.random() * (max_r-min_r) + min_r);
    var packer = new Packer (radiuses, ratio);
    draw_result(packer);
}

window.onload = draw;
