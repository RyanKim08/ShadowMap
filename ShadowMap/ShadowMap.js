"use strict";

var canvas;
var gl;
var program;

var latitudeBands = 30;
var longitudeBands = 30;
var radius = 1;

var planeVertCnt = 6;
var planeVertices = [
    vec4(-1.15, -1.75, 1.25, 1.0),
    vec4(-1.80, 0.5, 1.25, 1.0),
    vec4(-0.45, 0.75, -0.45, 1.0),
    vec4(-1.15, -1.75, 1.25, 1.0),
    vec4(-0.45, 0.75, -0.45, 1.0),
    vec4(0.05, -1.35, -0.45, 1.0)
];

var pointsArray = [];
var normalsArray = [];

var vBuffer;
var nBuffer;

var vPosition;
var vNormal;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var up = vec3(0.0, 1.0, 0.0);
var at = vec3(0.0, 0.0, 0.0);
var eye = vec3(0.0, 0.0, 1.0);

var near = -10;
var far = 110;
var left = -3.0;
var right = 3.0;
var ytop = 3.0;
var bottom = -3.0;

var planeTrans = [0.0, 1.0, 0];
var planeScale = 1.3;

var objScale = 0.3;
var objYMid = 1.2;
var objX = 2.12;
var objZ = 2.91;

var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var materialAmbient = vec4(0.8, 0.0, .8, 1.0);
var materialDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var materialSpecular = vec4(0.0, 0.0, 0.0, 1.0);

var shininess = 40.0;
var shininessLoc;

var lightTheta = 0.9;
var lightRad = 48;
var lightPosition = [lightRad * Math.sin(lightTheta), 10,
lightRad * Math.cos(lightTheta), 0];

var cameraPosition = [0.0, 0.0, 1.0];

var ambientProduct, ambientProductLoc;
var diffuseProduct, diffuseProductLoc;
var specularProduct, specularProductLoc;

var lightingLoc;


window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //

    initPoints();
    createPlane();
    createSphereMap();

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Create vertex buffer and vPosition attribute
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Create normal buffer and vNormal attribute
    nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    // Get buffer locations for the following shader variables
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");

    projectionMatrix = ortho(left, right, bottom, ytop, near, far);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    // Setting Lighting variables and their Uniform Locations
    var lightPositionLoc = gl.getUniformLocation(program, "lightPosition");
    gl.uniform4fv(lightPositionLoc, lightPosition);

    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);
    gl.uniform1f(shininessLoc, shininess);

    shininessLoc = gl.getUniformLocation(program, "shininess");
    ambientProductLoc = gl.getUniformLocation(program, "ambientProduct");
    diffuseProductLoc = gl.getUniformLocation(program, "diffuseProduct");
    specularProductLoc = gl.getUniformLocation(program, "specularProduct");

    gl.uniform4fv(ambientProductLoc, flatten(ambientProduct));
    gl.uniform4fv(diffuseProductLoc, flatten(diffuseProduct));
    gl.uniform4fv(specularProductLoc, flatten(specularProduct));

    render();
}

function initPoints() {
    pointsArray = [];
    normalsArray = [];
}

// Create Plane filling pointsArray and normalsArray
function createPlane() {
    pointsArray.push(planeVertices[0]);
    pointsArray.push(planeVertices[1]);
    pointsArray.push(planeVertices[2]);
    pointsArray.push(planeVertices[3]);
    pointsArray.push(planeVertices[4]);
    pointsArray.push(planeVertices[5]);

    var t1 = subtract(planeVertices[1], planeVertices[0]);
    var t2 = subtract(planeVertices[1], planeVertices[2]);
    var normal = vec3(cross(t1, t2));

    normalsArray.push(normal);
    normalsArray.push(normal);
    normalsArray.push(normal);
    normalsArray.push(normal);
    normalsArray.push(normal);
    normalsArray.push(normal);
}

// Create SphereMap by filling pointsArray and normalsArray
function createSphereMap() {
    var phi1, phi2, sinPhi1, sinPhi2, cosPhi1, cosPhi2;
    var theta1, theta2, sinTheta1, sinTheta2, cosTheta1, cosTheta2;
    var p1, p2, p3, p4, u1, u2, v1, v2, uv1, uv2, uv3, uv4;
    var r = radius;

    // For each latitudinal band determine phi's value
    for (var latNumber = 1; latNumber <= latitudeBands; latNumber++) {
        phi1 = Math.PI * (latNumber - 1) / latitudeBands;
        sinPhi1 = Math.sin(phi1);
        cosPhi1 = Math.cos(phi1);

        phi2 = Math.PI * latNumber / latitudeBands;
        sinPhi2 = Math.sin(phi2);
        cosPhi2 = Math.cos(phi2);

        // For each longitudinal band determine theta's value and other calculations
        for (var longNumber = 1; longNumber <= longitudeBands; longNumber++) {
            theta1 = 2 * Math.PI * (longNumber - 1) / longitudeBands;
            sinTheta1 = Math.sin(theta1);
            cosTheta1 = Math.cos(theta1);

            theta2 = 2 * Math.PI * longNumber / longitudeBands;
            sinTheta2 = Math.sin(theta2);
            cosTheta2 = Math.cos(theta2);

            p1 = vec4(cosTheta1 * sinPhi1 * r, cosPhi1 * r, sinTheta1 * sinPhi1 * r, 1.0);
            p2 = vec4(cosTheta2 * sinPhi1 * r, cosPhi1 * r, sinTheta2 * sinPhi1 * r, 1.0);
            p3 = vec4(cosTheta1 * sinPhi2 * r, cosPhi2 * r, sinTheta1 * sinPhi2 * r, 1.0);
            p4 = vec4(cosTheta2 * sinPhi2 * r, cosPhi2 * r, sinTheta2 * sinPhi2 * r, 1.0);

            pointsArray.push(p1);
            pointsArray.push(p2);
            pointsArray.push(p3);
            pointsArray.push(p2);
            pointsArray.push(p4);
            pointsArray.push(p3);

            u1 = 1 - ((longNumber - 1) / longitudeBands);
            u2 = 1 - (longNumber / longitudeBands);
            v1 = 1 - ((latNumber - 1) / latitudeBands);
            v2 = 1 - (latNumber / latitudeBands);

            uv1 = vec2(u1, v1);
            uv2 = vec2(u2, v1);
            uv3 = vec2(u1, v2);
            uv4 = vec2(u2, v2);

            normalsArray.push(vec3(p1));
            normalsArray.push(vec3(p2));
            normalsArray.push(vec3(p3));
            normalsArray.push(vec3(p2));
            normalsArray.push(vec3(p4));
            normalsArray.push(vec3(p3));
        }
    }
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    eye = cameraPosition;

    modelViewMatrix = lookAt(eye, at, up);

    modelViewMatrix = mult(modelViewMatrix, translate(planeTrans));
    modelViewMatrix = mult(modelViewMatrix, scalem(planeScale, planeScale, planeScale));

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    // Render the Plane //
    gl.drawArrays(gl.TRIANGLES, 0, planeVertCnt);


    modelViewMatrix = translate(objX, objYMid, objZ);
    modelViewMatrix = mult(modelViewMatrix, scalem(objScale, objScale, objScale));

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    // Render the Object //
    gl.drawArrays(gl.TRIANGLES, planeVertCnt,
        pointsArray.length - planeVertCnt);

    requestAnimFrame(render);
}
