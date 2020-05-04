// -----------------------------------------------------------------------------------------------------------------------
window["mat4"] = glMatrix.mat4;
window["mat3"] = glMatrix.mat3;     

// -----------------------------------------------------------------------------------------------------------------------
const VertexItemSize = 3;
const ColorItemSize = 4;

// -----------------------------------------------------------------------------------------------------------------------
export var igwState = 
{
    glContext : null,
    mvMatrixStack : [],
    mvMatrix : null,
    pMatrix : null,
    
    mvPushMatrix : function()
    {
        var copy = mat4.create();
        mat4.copy(copy, this.mvMatrix);
        this.mvMatrixStack.push(copy);
    },

    mvPopMatrix : function()
    {
        if (this.mvMatrixStack.length == 0) {
            throw "Invalid popMatrix!";
        }
        this.mvMatrix = this.mvMatrixStack.pop();
    },

    matTranslate : function(tvec)
    {
        mat4.translate(this.mvMatrix,this.mvMatrix, tvec);
    },
    
    matScale : function(svec)
    {
        mat4.scale(this.mvMatrix,this.mvMatrix, svec);
    },

    matRotate : function(rvec)
    {
        mat4.rotate(this.mvMatrix,this.mvMatrix, rvec[0], [1, 0, 0]);
        mat4.rotate(this.mvMatrix,this.mvMatrix, rvec[1], [0, 1, 0]);
        mat4.rotate(this.mvMatrix,this.mvMatrix, rvec[2], [0, 0, 1]);
    }
};

// -----------------------------------------------------------------------------------------------------------------------
export function igwTexture(url)
{
    var gl = igwState.glContext;
    
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);
    
    // temporary one blue pixel texture
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                pixel);

    // when loading will be finished, update texture
    const image = new Image();
    image.onload = function()
    {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  srcFormat, srcType, image);

        if (isPowerOf2(image.width) && isPowerOf2(image.height))
        {
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        else
        {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    };
    
    // start loading
    image.src = url;

    return texture;
}

// -----------------------------------------------------------------------------------------------------------------------
export function isPowerOf2(value)
{
    return (value & (value - 1)) == 0;
}

// -----------------------------------------------------------------------------------------------------------------------
export function igwInit(canvasId)
{
    var gl = null;
    
    try
    {
        var canvas = document.getElementById(canvasId); 
        gl = canvas.getContext("webgl");
        gl.viewportWidth = canvas.width; 
        gl.viewportHeight = canvas.height;
    }
    catch(e) {} 
    if (!gl) alert("Could not initialise WebGL"); 
    
    if(gl != null)
    {
        igwState.glContext = gl;
        gl.clearColor(70.0/255.0, 131.0/255.0, 138.0/255.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        
        igwState.mvMatrix = mat4.create();
        igwState.pMatrix = mat4.create();
    }
}

// -----------------------------------------------------------------------------------------------------------------------
export function buildFragShader(src)
{
    var gl = igwState.glContext;
    var shader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

// -----------------------------------------------------------------------------------------------------------------------
export function buildVertShader(src)
{
    var gl = igwState.glContext;
    var shader = gl.createShader(gl.VERTEX_SHADER);

    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

// -----------------------------------------------------------------------------------------------------------------------
export var IgwShaderProgram = 
{
    shaderProgram : null,
    vertexAttrib : null,
    colorAttrib : null,
    pMatrixUniform : null,
    mvMatrixUniform : null,
    samplerUniform : null,
    
    init : function(vertcode, fragcode)
    {
        var gl = igwState.glContext;
        
        var vertexShader = buildVertShader(vertcode);
        var fragmentShader = buildFragShader(fragcode);

        this.shaderProgram = gl.createProgram(); 
        gl.attachShader(this.shaderProgram, vertexShader); 
        gl.attachShader(this.shaderProgram, fragmentShader); 
        gl.linkProgram(this.shaderProgram); 

        if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) { 
            alert("Could not initialise shaders"); 
        } 

        gl.useProgram(this.shaderProgram);

        this.vertexAttrib = gl.getAttribLocation(this.shaderProgram, "aVertexPosition"); 
        gl.enableVertexAttribArray(this.vertexAttrib);
        
        this.colorAttrib = gl.getAttribLocation(this.shaderProgram, "aVertexColor");
        gl.enableVertexAttribArray(this.colorAttrib);
        
        this.pMatrixUniform = gl.getUniformLocation(this.shaderProgram, "uPMatrix"); 
        this.mvMatrixUniform = gl.getUniformLocation(this.shaderProgram, "uMVMatrix");
        this.samplerUniform = gl.getUniformLocation(this.shaderProgram, 'uSampler');
    },
    
    use : function()
    {
        var gl = igwState.glContext;
        gl.useProgram(this.shaderProgram);
    },
    
    setUniforms : function(pMatrix, mvMatrix)
    {
        var gl = igwState.glContext;
        gl.uniformMatrix4fv(this.pMatrixUniform, false, pMatrix); 
        gl.uniformMatrix4fv(this.mvMatrixUniform, false, mvMatrix); 
    },
    
    setTextureUniform : function(texture)
    {
        var gl = igwState.glContext;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(this.samplerUniform, 0);
    },
    
    setUniform2f : function(name, value)
    {
        this.use();
        var gl = igwState.glContext;
        var location = gl.getUniformLocation(this.shaderProgram, name); 
        gl.uniform2fv(location, value);
    },
    
    setAttribs : function(vertexArray, colorArray)
    {
        var gl = igwState.glContext;
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexArray);
        gl.vertexAttribPointer(this.vertexAttrib, vertexArray.itemSize, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, colorArray);
        gl.vertexAttribPointer(this.colorAttrib, colorArray.itemSize, gl.FLOAT, false, 0, 0);
    }
};

// -----------------------------------------------------------------------------------------------------------------------
export var IgwMesh = 
{
    vertexArray : null,
    colorArray : null,
    primitive : null,
    
    init : function(vertices, colors, prim)
    {
        var gl = igwState.glContext;
        this.vertexArray = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexArray);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        this.vertexArray.itemSize = VertexItemSize;
        this.vertexArray.numItems = vertices.length / VertexItemSize;
        
        this.colorArray = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorArray);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        this.colorArray.itemSize = ColorItemSize;
        this.colorArray.numItems = colors.length / ColorItemSize;
        
        this.primitive = prim;
    },
    
    draw : function(shaderProgram)
    {
        var gl = igwState.glContext;
        shaderProgram.setAttribs(this.vertexArray, this.colorArray);
        gl.drawArrays(this.primitive, 0, this.vertexArray.numItems);
    }
};


// -----------------------------------------------------------------------------------------------------------------------
export var IgwDrawable = 
{
    mesh : null,
    shaderProgram : null,
    texture : null,
    position : [0,0,0],
    rotation : [0,0,0],
    scale : [1,1,1],
    children : [],
    
    init : function(mesh, shader, texture)
    {
        this.mesh = mesh;
        this.shaderProgram = shader;
        this.texture = texture;
    },
    
    setPosition : function(pvec)
    {
        this.position = pvec;
    },
    
    setRotation : function(rvec)
    {
       this.rotation = rvec; 
    },
    
    setScale : function(svec)
    {
       this.scale = svec; 
    },
    
    addChild : function(child)
    {
        this.children = this.children.concat([child]);
    },
    
    draw : function()
    {
        igwState.mvPushMatrix();
        
        igwState.matTranslate(this.position);
        igwState.matRotate(this.rotation);
        igwState.matScale(this.scale);
        
        this.shaderProgram.use();
        this.shaderProgram.setUniforms(igwState.pMatrix,igwState.mvMatrix);
        if(this.texture != null) this.shaderProgram.setTextureUniform(this.texture);
        
        this.mesh.draw(this.shaderProgram);
        
        for(var i=0;i<this.children.length;i++) this.children[i].draw();
        
        igwState.mvPopMatrix();
    }
};

// -----------------------------------------------------------------------------------------------------------------------
export function createArrow()
{    
    var vertices = [
        1.0, 0.0, 0.0,
        -1.0, 0.866, -0.5,
        -1.0, -0.866, -0.5,
        
        1.0, 0.0, 0.0,
        -1.0, 0.866, -0.5,
        -1.0, 0.0, 1.0,
        
        1.0, 0.0, 0.0,
        -1.0, -0.866, -0.5,
        -1.0, 0.0, 1.0
    ];
    
    var colors = [
        1.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0,
        
        1.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0,
        
        1.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0
    ];
    
    var mesh = Object.create(IgwMesh);
    mesh.init(vertices, colors, igwState.glContext.TRIANGLES);
    return mesh;
}

// -----------------------------------------------------------------------------------------------------------------------
export function createHexagon()
{
    // center vertice and color
    var vertices = [0.0, 0.0, 0.0];
    var colors = [1.0, 1.0, 1.0, 1.0];
    
    var radstep = Math.PI / 3.0;
    
    for(var i=0; i<=6; i++)
    {
        vertices = vertices.concat( [Math.cos(i*radstep)*1.0, Math.sin(i*radstep)*1.0, 0.0] );
        colors = colors.concat( [1.0, 1.0, 1.0, 1.0] );
    }
    
    var mesh = Object.create(IgwMesh);
    mesh.init(vertices, colors, igwState.glContext.TRIANGLE_FAN);
    
    return mesh;
}

// -----------------------------------------------------------------------------------------------------------------------
export function createShader(vertcode, fragcode)
{
    var shader = Object.create(IgwShaderProgram);
    shader.init(vertcode, fragcode);
    return shader;
}

// -----------------------------------------------------------------------------------------------------------------------
export function startFrame()
{
    var gl = igwState.glContext;
    
    gl.viewport(0,0,gl.viewportWidth,gl.viewportHeight);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    
    igwState.mvMatrixStack = [];
    mat4.perspective(igwState.pMatrix,45,gl.viewportWidth/gl.viewportHeight,0.1,100.0);
    mat4.identity(igwState.mvMatrix);
}

// -----------------------------------------------------------------------------------------------------------------------
export function setViewport(w,h)
{
    var gl = igwState.glContext;
    gl.viewportWidth = w;
    gl.viewportHeight = h;
}

// -----------------------------------------------------------------------------------------------------------------------
export function Rgb2Hex(rgb)
{
    let r = rgb[0].toString(16), g = rgb[1].toString(16), b = rgb[2].toString(16);

    if (r.length == 1) r = "0" + r;
    if (g.length == 1) g = "0" + g;
    if (b.length == 1) b = "0" + b;

    return "#" + r + g + b;
}

// -----------------------------------------------------------------------------------------------------------------------
export function Rgb2Hsl(rgb)
{
    // Make r, g, and b fractions of 1
    let r = rgb[0] / 255;
    let g = rgb[1] / 255;
    let b = rgb[2] / 255;

    // Find greatest and smallest channel values
    let cmin = Math.min(r,g,b),
    cmax = Math.max(r,g,b),
    delta = cmax - cmin,
    h = 0,
    s = 0,
    l = 0;

    // Calculate hue
    // No difference
    if (delta == 0)
    h = 0;
    // Red is max
    else if (cmax == r)
    h = ((g - b) / delta) % 6;
    // Green is max
    else if (cmax == g)
    h = (b - r) / delta + 2;
    // Blue is max
    else
    h = (r - g) / delta + 4;

    h = Math.round(h * 60);

    // Make negative hues positive behind 360°
    if (h < 0) h += 360;

    // Calculate lightness
    l = (cmax + cmin) / 2;

    // Calculate saturation
    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

    // Multiply l and s by 100
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return [h,s,l];
}
