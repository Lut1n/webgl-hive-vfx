// -----------------------------------------------------------------------------------------------------------------------
import * as igw from "./wgl-helpers.js";

// -----------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------
// Shader Glsl Code
// -----------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------
const glsl_vert_basic = `
    attribute vec3 aVertexPosition; 

    uniform mat4 uMVMatrix; 
    uniform mat4 uPMatrix; 

    void main(void) { 
        gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0); 
    }
`;

// -----------------------------------------------------------------------------------------------------------------------
const glsl_vert_color = `
attribute vec3 aVertexPosition;
attribute vec4 aVertexColor;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

varying vec4 vColor;

void main(void) {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vColor = aVertexColor;
}
`;

// -----------------------------------------------------------------------------------------------------------------------
const glsl_vert_texture = `
attribute vec3 aVertexPosition;
attribute vec4 aVertexColor;
// attribute vec4 aVertexTexCoord;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

uniform vec2 uTextureSize;

varying vec4 vColor;
varying vec2 vTexCoord;
varying vec2 vTextureSize;
varying vec2 vCenter;

void main(void) {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vec3 mnfvertex = aVertexPosition;
    vec4 mvPos = uPMatrix * uMVMatrix * vec4(mnfvertex, 1.0);
    mvPos /= mvPos.w;
    vTexCoord = mvPos.xy * 0.5 + 0.5; // aVertexTexCoord.st;
    vTexCoord.y = 1.0 - vTexCoord.y;
    vColor = aVertexColor;
    vTextureSize = uTextureSize;
    
    vec4 center4 = uPMatrix * uMVMatrix * vec4(0.0,0.0,0.0, 1.0);
    vCenter = (center4.xy / center4.w) * 0.5 + 0.5;
    vCenter.y = 1.0 - vCenter.y;
}
`;

// -----------------------------------------------------------------------------------------------------------------------
const glsl_vert_magnify = `
attribute vec3 aVertexPosition;
attribute vec4 aVertexColor;
// attribute vec4 aVertexTexCoord;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

uniform vec2 uTextureSize;

varying vec4 vColor;
varying vec2 vTexCoord;
varying vec2 vTextureSize;

void main(void) {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vec3 mnfvertex = aVertexPosition; mnfvertex.xy *= 0.5;
    vec4 mvPos = uPMatrix * uMVMatrix * vec4(mnfvertex, 1.0);
    mvPos /= mvPos.w;
    vTexCoord = mvPos.xy * 0.5 + 0.5; // aVertexTexCoord.st;
    vTexCoord.y = 1.0 - vTexCoord.y;
    vColor = aVertexColor;
    vTextureSize = uTextureSize;
}
`;

// -----------------------------------------------------------------------------------------------------------------------
const glsl_frag_basic = `
precision mediump float; 

void main(void) { 
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); 
} 
`;

// -----------------------------------------------------------------------------------------------------------------------
const glsl_frag_color = `
precision mediump float;

varying vec4 vColor;

void main(void) {
    gl_FragColor = vColor;
}
`;

// -----------------------------------------------------------------------------------------------------------------------
const glsl_frag_texture = `
precision mediump float;

varying vec4 vColor;
varying vec2 vTexCoord;

uniform sampler2D uSampler;

void main(void) {
    gl_FragColor = vColor * texture2D(uSampler, vTexCoord);
}
`;

// -----------------------------------------------------------------------------------------------------------------------
const glsl_frag_posterized = `
precision mediump float;

varying vec4 vColor;
varying vec2 vTexCoord;
varying vec2 vCenter;

uniform sampler2D uSampler;
varying vec2 vTextureSize;

void main()
{
    vec3 sample = texture2D(uSampler, vTexCoord).xyz;
    float g = (sample.x+sample.y+sample.z)/3.0;

    const float Q = 8.0;
    // ivec3 quantities = ivec3(floor(sample*Q));
    int quantity = int(floor(g*Q));
    
    // vec3 quantifieds = vec3(quantities)/Q;
    float quantified = float(quantity)/Q;
    
    gl_FragColor = vec4(vec3(quantified),1.0);
}
`;

// -----------------------------------------------------------------------------------------------------------------------
const glsl_frag_normals = `
precision mediump float;

varying vec4 vColor;
varying vec2 vTexCoord;
varying vec2 vCenter;

uniform sampler2D uSampler;
varying vec2 vTextureSize;

vec3 src_value(vec2 uv, ivec2 oft)
{
    vec2 sample_oft = vec2(oft.x,oft.y) - vec2(1.5);
    vec2 sample_uv = uv + sample_oft/vTextureSize;
    return texture2D(uSampler, sample_uv).xyz;
}

void main()
{
    mat3 matrix;
    matrix[0] = vec3(1.0, 2.0, 1.0);
    matrix[1] = vec3(0.0, 0.0, 0.0);
    matrix[2] = vec3(-1.0, -2.0, -1.0);


    vec2 uv = vTexCoord.xy;
    // uv.y = 1.0 - uv.y;
    float gx = 0.0;
    float gy = 0.0;

    for(int x=0;x<3;++x)
    {
        for(int y=0;y<3;++y)
        {
            ivec2 st = ivec2(x,y);
            gx += src_value(uv, st.xy).x *  matrix[x][y];
            gy += src_value(uv, st.xy).x *  matrix[y][x];
        }
    }

    vec2 uvnormal = vec2(gx,gy);
    uvnormal = clamp(uvnormal,-1.0,1.0);
    
    vec3 normal = vec3(uvnormal,1.0); normal = normalize(normal);
    
    gl_FragColor = vec4(normal * 0.5 + 0.5,1.0);
}
`;

// -----------------------------------------------------------------------------------------------------------------------
const glsl_frag_light = `
precision mediump float;

varying vec4 vColor;
varying vec2 vTexCoord;
varying vec2 vCenter;

uniform sampler2D uSampler;
varying vec2 vTextureSize;

vec3 src_value(vec2 uv, ivec2 oft)
{
    vec2 sample_oft = vec2(oft.x,oft.y) - vec2(1.5);
    vec2 sample_uv = uv + sample_oft/vTextureSize;
    return texture2D(uSampler, sample_uv).xyz;
}

void main()
{
    mat3 matrix;
    matrix[0] = vec3(1.0, 2.0, 1.0);
    matrix[1] = vec3(0.0, 0.0, 0.0);
    matrix[2] = vec3(-1.0, -2.0, -1.0);


    vec2 uv = vTexCoord.xy;
    // uv.y = 1.0 - uv.y;
    float gx = 0.0;
    float gy = 0.0;

    for(int x=0;x<3;++x)
    {
        for(int y=0;y<3;++y)
        {
            ivec2 st = ivec2(x,y);
            gx += src_value(uv, st.xy).x *  matrix[x][y];
            gy += src_value(uv, st.xy).x *  matrix[y][x];
        }
    }

    vec2 uvnormal = vec2(gx,gy);
    uvnormal = clamp(uvnormal,-1.0,1.0);

    vec3 normal = vec3(-uvnormal,1.0); normal = normalize(normal);

    vec3 light = vec3(vCenter,0.05);

    vec3 lightdir = normalize(light - vec3(vTexCoord,0.0));
    float diff = max(dot(normal, lightdir), 0.0);


    // gl_FragColor = vec4((normal * 0.5 + 0.5),1.0);
    gl_FragColor = vec4(vec3(diff),1.0);
}
`;

// -----------------------------------------------------------------------------------------------------------------------
const glsl_frag_sobel = `
precision mediump float;

varying vec4 vColor;
varying vec2 vTexCoord;

uniform sampler2D uSampler;
varying vec2 vTextureSize;

vec3 src_value(vec2 uv, ivec2 oft)
{
    vec2 sample_oft = vec2(oft.x,oft.y) - vec2(1.5);
    vec2 sample_uv = uv + sample_oft/vTextureSize;
    return texture2D(uSampler, sample_uv).xyz;
}

void main()
{
    mat3 matrix;
    matrix[0] = vec3(1.0, 2.0, 1.0);
    matrix[1] = vec3(0.0, 0.0, 0.0);
    matrix[2] = vec3(-1.0, -2.0, -1.0);


    vec2 uv = vTexCoord.xy;
    // uv.y = 1.0 - uv.y;
    float gx = 0.0;
    float gy = 0.0;

    for(int x=0;x<3;++x)
    {
        for(int y=0;y<3;++y)
        {
            ivec2 st = ivec2(x,y);
            gx += src_value(uv, st.xy).x *  matrix[x][y];
            gy += src_value(uv, st.xy).x *  matrix[y][x];
        }
    }

    float pi = 3.141592;

    float grad = sqrt( gx*gx + gy*gy );
    float ori = 0.0;
    if(gx==0.0)
        ori = gy>0.0 ? pi*0.5 : -pi*0.5;
    else
        ori = atan(gy,gx);


    grad = clamp(grad,0.0,1.0);
    ori += pi;
    ori /= (2.0*pi);
    // vec3 gd_map = vec3(grad,ori,0.0);
    vec3 gd_map = vec3(grad);
    
    vec3 yellow = vec3(1.0,1.0,0.0);
    vec3 red = vec3(1.0,0.0,0.0);
    vec3 green = vec3(0.0,1.0,0.0);
    vec3 blue = vec3(0.0,0.0,1.0);
    
    float gkey = 0.2;
    vec3 color = mix(blue, green,  grad/gkey) * step(grad,gkey);
    color += mix(green, red, (grad-gkey)/(1.0-gkey)) * step(gkey,grad);

    gl_FragColor = vec4(color, 1.0);
}
`;
// -----------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------


// -----------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------
// Helping constants and functions
// -----------------------------------------------------------------------------------------------------------------------
const Deg2Rad = Math.PI / 180;

// -----------------------------------------------------------------------------------------------------------------------
function mix(v1, v2, f)
{
    return (v2-v1)*f + v1;
}

// -----------------------------------------------------------------------------------------------------------------------
function animateValue(value, target, speed, deltatime)
{
    if(value < target) value =  Math.min(target, value + speed * deltatime);
    else if(value > target) value =  Math.max(target, value - speed * deltatime);
    return value;
}

// -----------------------------------------------------------------------------------------------------------------------
// Page elements
var backgroundImage;
var imageCanvas;
var renderCanvas;
var infoPanel;
var mouseSurface;

// Scene objects
var arrow3d;
var arrow3dShader;
var hiveShaders = [];
var hiveMeshes = [];

// Histogram data
var samples = [];
var max_samples = 500;
var histo = [0,0,0,0,0,0,0,0];

// Color picker data
var pointedRgb = [0,0,0,0];
var pointedHsl = [0,0,0];
var pointedHex = "#000000";

// animation stuff
var lastTime = 0;
var selectedHiveIndex = 0;
var selectionState = 0;
var sizeState = 0;
var targetSizeState = 0;

// info panel data
var info_left_side = false;
var panel_x_target = 0;
var panel_x_corrected = 0;
var panel_x = 0;
var panel_y = 0;

// Scene state
var rTri = 0;
var hexagon_pos=[0,0];
var picker_pos=[0,0];
var viewport = [0,0];
var texture;


// -----------------------------------------------------------------------------------------------------------------------
function tick()
{
    requestAnimationFrame(tick);
    drawScene();
    animate();
}

// -----------------------------------------------------------------------------------------------------------------------
function onMouseDown(e)
{
    if(e.button == 0)
    {
        if(targetSizeState == 0.0) targetSizeState = 1.0;
        else targetSizeState = 0.0;
    }
    else if(e.button == 2)
    {
        if(++selectedHiveIndex >= hiveMeshes.length) selectedHiveIndex = 0;
    }
}

// -----------------------------------------------------------------------------------------------------------------------
function pickColorValueAt(x,y)
{
    pointedRgb = imageCanvas.getContext('2d').getImageData(x, y, 1, 1).data;
    pointedHsl = igw.Rgb2Hsl(pointedRgb);
    pointedHex = igw.Rgb2Hex(pointedRgb);
}

// -----------------------------------------------------------------------------------------------------------------------
function moveInfoPanel(x,y)
{
    // some constants
    const panel_size = 170;
    const offset_x = 100;
    const offset_y = -50;
    
    if(panel_x_target + panel_size >= viewport[0])
    {
        info_left_side = true;
    }
    else if(panel_x_target <= 0)
    {
        info_left_side = false;
    }
    
    if(info_left_side)
        panel_x_target = (x-(panel_size+offset_x));
    else
        panel_x_target = (x+offset_x);
    
    // prepare for animating x position
    panel_x_corrected = info_left_side ? 0 : (viewport[0]-panel_size);
    
    // clamp and update Y position
    panel_y = y+offset_y;
    panel_y = Math.max(panel_y, 0);
    panel_y = Math.min(panel_y, viewport[1]-infoPanel.clientHeight);
    infoPanel.style.top = panel_y+"px";
}

// -----------------------------------------------------------------------------------------------------------------------
function onMouseMove(e)
{
    var x = e.clientX;
    var y = e.clientY;

    picker_pos = [x,y];
    
    var aspectRatio = viewport[0]/viewport[1];
    var projy = Math.tan(45*Deg2Rad) *10.0;
    var projx = projy * aspectRatio;

    hexagon_pos[0] = (x/viewport[0])*projx - 0.5*projx;
    hexagon_pos[1] = (1.0-y/viewport[1]) * projy - 0.5*projy;
    
    moveInfoPanel(x,y);
    
    pickColorValueAt(x,y);
}

// -----------------------------------------------------------------------------------------------------------------------
function initInfo()
{
    var picker = document.getElementById("pickerColorID");
    picker.style.backgroundColor = "rgb(255,0,0)";
    
    
    var colorValues = document.getElementById("pixelValueID");
    colorValues.innerHTML = "RGB: 0,0,0" + "<br/>" + "HSL: 0,0,0" + "<br/>" + "HEX: #FFFFFF";
    
    var step = 255/histo.length;
    for(var i=0;i<histo.length;i++)
    {
        var histoID = "histo-class"+(1+i);
        var histoHead = document.getElementById(histoID);
        histoHead.style.backgroundColor = "rgb("+i*step+","+i*step+","+i*step+")";
    }
}

// -----------------------------------------------------------------------------------------------------------------------
function updateInfo(rgbValue, hslValue, hexValue, histo)
{
    var picker = document.getElementById("pickerColorID");
    picker.style.backgroundColor = "rgb("+rgbValue[0]+","+rgbValue[1]+","+rgbValue[2]+")";
    
    
    var colorValues = document.getElementById("pixelValueID");
    colorValues.innerHTML = "RGB: "+rgbValue[0]+","+rgbValue[1]+","+rgbValue[1] + "<br/>";
    colorValues.innerHTML +="HSL: "+hslValue[0]+","+hslValue[1]+","+hslValue[2]+"<br/>";
    colorValues.innerHTML += "HEX: " + hexValue.toUpperCase();
    
    var step = 255/histo.length;
    for(var i=0;i<histo.length;i++)
    {
        var histoID = "histo-class-value"+(1+i);
        var histoBar = document.getElementById(histoID);
        histoBar.style.width = (histo[i]*150/samples.length)+"px";
    }
}

// -----------------------------------------------------------------------------------------------------------------------
function updateViewport()
{
    if(backgroundImage.height != viewport[1])
    {
        // set new values
        viewport[0] = backgroundImage.width;
        viewport[1] = backgroundImage.height;
        
        // resize all
        imageCanvas.width = viewport[0];
        imageCanvas.height = viewport[1];
        renderCanvas.width = viewport[0];
        renderCanvas.height = viewport[1];
        mouseSurface.width = viewport[0];
        mouseSurface.height = viewport[1];
        
        // redraw image canvas
        imageCanvas.getContext('2d').drawImage(backgroundImage, 0, 0, viewport[0], viewport[1]);
        
        // update gl state
        igw.setViewport(viewport[0], viewport[1]);
        
        // update viewport parameters of shaders
        arrow3dShader.use();
        arrow3dShader.setUniform2f("uTextureSize",[viewport[0],viewport[1]]);
        hiveShaders.forEach(function(item, index, array)
        {
            item.use();
            item.setUniform2f("uTextureSize",viewport);
        });
    }
}


// -----------------------------------------------------------------------------------------------------------------------
function pickHistoSamples(elapsed)
{
    while(samples.length > max_samples) samples.shift(); // pop front 
    
    // how many samples to pick on this frame
    var delay = 1;
    var samplePerSec =  max_samples / delay;
    var N = Math.ceil(samplePerSec * elapsed);
    
    // pick samples
    for(var n=0;n<N;n++)
    {
        var pixelData = imageCanvas.getContext('2d').getImageData(picker_pos[0]+Math.random()*100-50, picker_pos[1]+Math.random()*100-50, 1, 1).data;
        samples.push(pixelData);
    }
    
    // recompute histogram
    histo = [0,0,0,0,0,0,0,0];
    var step = 255/histo.length;
    samples.forEach(function(item, index, array)
    {
        var fnd = -1;
        for(var i=0;i<histo.length;i++)
        {
            if(item[0] < (i+1)*step) {fnd=i; break;}
        }
        if(fnd==-1) histo[histo.length-1]++;
        else histo[fnd]++;
        
    });
}

// -----------------------------------------------------------------------------------------------------------------------
function animate()
{
    var timeNow = new Date().getTime() / 1000.0;
    if (lastTime != 0)
    {
        var elapsed = timeNow - lastTime;
        
        if(backgroundImage.height != viewport[1]) updateViewport();
        
        rTri += elapsed * 3.0;
        
        panel_x = animateValue(panel_x, panel_x_corrected, 1000.0, elapsed);
        infoPanel.style.left = panel_x + "px";
        
        if(selectionState != selectedHiveIndex && selectedHiveIndex==0)
        {
            // perform a loop selection on each "hive tools"
            selectionState = animateValue(selectionState, hiveMeshes.length, 3.0, elapsed);
            if(selectionState == hiveMeshes.length) selectionState = selectedHiveIndex;
        }
        else
        {
            selectionState = animateValue(selectionState, selectedHiveIndex, 3.0, elapsed);
        }

        sizeState = animateValue(sizeState, targetSizeState, 3.0, elapsed);
        
        pickHistoSamples(elapsed);
        updateInfo(pointedRgb, pointedHsl, pointedHex, histo);
        
    }
    lastTime = timeNow;
}

// -----------------------------------------------------------------------------------------------------------------------
function drawScene()
{   
    igw.startFrame();
    
    // eye view
    igw.igwState.matTranslate([0.0, 0.0, -10.0]);
    
    // draw arrow 3d
    arrow3d.setScale([0.5, 0.5, 0.5]);
    arrow3d.setPosition([hexagon_pos[0]-1.5-sizeState*4, hexagon_pos[1], 0]);
    arrow3d.setRotation([rTri, 0, 0]);
    arrow3d.draw();

    // for each "hive tool", set scale, position, rotation and draw it
    hiveMeshes.forEach(function(item, index, array)
    {
        var local = Math.abs(selectionState-index);
        if(index == 0) local = Math.min(local, Math.abs(selectionState-hiveMeshes.length));
        var localstate = (1.0-Math.min(1.0,local)) * sizeState;
        item.setScale([1+4*localstate, 1+4*localstate, 1]);
        item.setPosition([hexagon_pos[0], hexagon_pos[1]+Math.min(1.0,local)*20, 0.0]);
        item.setRotation([-Math.min(1.0,local)*Math.PI*0.5,0,rTri]);
        item.draw();
    });
}

// -----------------------------------------------------------------------------------------------------------------------
function startAll()
{
    // get page elements
    backgroundImage = document.getElementById('imageID');
    renderCanvas = document.getElementById('canvasID');
    infoPanel = document.getElementById("infoPanelID");
    imageCanvas = document.createElement('canvas');
    mouseSurface = document.getElementById("mouseSurfaceID");

    // disable context menu and set mouse event
    mouseSurface.addEventListener('contextmenu', function(e){e.preventDefault();return false;}, false);
    mouseSurface.onmousemove = onMouseMove;
    mouseSurface.onmousedown = onMouseDown;

    // init webGL scene
    igw.igwInit("canvasID");
    
    // create shaders
    arrow3dShader = igw.createShader(glsl_vert_texture, glsl_frag_texture);
    var shader01 = igw.createShader(glsl_vert_magnify, glsl_frag_texture);
    var shader02 = igw.createShader(glsl_vert_texture, glsl_frag_sobel);
    var shader03 = igw.createShader(glsl_vert_texture, glsl_frag_posterized);
    var shader04 = igw.createShader(glsl_vert_texture, glsl_frag_light);

    hiveShaders.push(shader01);
    hiveShaders.push(shader02);
    hiveShaders.push(shader03);
    hiveShaders.push(shader04);

    // update viewport and sizes
    updateViewport();
    
    // load texture from image
    texture = igw.igwTexture(imageCanvas.toDataURL());

    // create meshes to draw
    arrow3d = Object.create(igw.IgwDrawable); arrow3d.init(igw.createArrow(),arrow3dShader, texture);
    var len01 = Object.create(igw.IgwDrawable); len01.init(igw.createHexagon(),shader01, texture);
    var len02 = Object.create(igw.IgwDrawable); len02.init(igw.createHexagon(),shader02, texture);
    var len03 = Object.create(igw.IgwDrawable); len03.init(igw.createHexagon(),shader03, texture);
    var len04 = Object.create(igw.IgwDrawable); len04.init(igw.createHexagon(),shader04, texture);

    hiveMeshes.push(len01);
    hiveMeshes.push(len02);
    hiveMeshes.push(len03);
    hiveMeshes.push(len04);

    // init info panel
    initInfo();
    
    // start render loop
    tick();
}

// -----------------------------------------------------------------------------------------------------------------------
startAll();
