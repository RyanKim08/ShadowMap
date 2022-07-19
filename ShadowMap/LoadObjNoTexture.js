"use strict";

var numMeshes = 0;
var vertices = [];
var indices = [];
var norms = [];
var norm_indices = [];
var hasNorms = true;

function loadobj(objData) {
    loaddata(objData);
    makemesh();
}

function loaddata(objText) {
    var regExp1 = new RegExp("\n|\r");
    var regExp2 = new RegExp("\\s+");
    var lines = objText.split(regExp1);
    var line;
    var lineArr;
    var wordArr;
    var indSet;
    var indNum;
    var indCnt = 0;
    var norm_indSet;
    var norm_indNum;
    var norm_indCnt = 0;
    var hasNorm = false;
    var div1, div2, div3;
    var highDiv = 1;
    var tempVert = [];
    var toppoint = 0;      // y+
    var bottompoint = 0;   // y-
    var leftpoint = 0;     // x-
    var rightpoint = 0;    // x+
    var farpoint = 0;      // z-
    var nearpoint = 0;     // z+
    var firstpass = true;
    var xshift = 0;
    var yshift = 0;
    var zshift = 0;
    var vCnt = 0;

    vertices = [];
    indices = [];
    norm_indices = [];
    norms = [];

    numMeshes = 0;

    for (var q = 0; q < lines.length; ++q) {
        line = lines[q].trim();
        while (line.length > 0 && line.charCodeAt(0) == 0) {
            line = line.substring(1);
        }
        if (line.length > 1 && line.charAt(0) == "v" && line.charAt(1) == " ") {
            lineArr = line.split(regExp2);
            if (lineArr.length == 4 || lineArr.length == 7) {
                div1 = Number(lineArr[1]);
                div2 = Number(lineArr[2]);
                div3 = Number(lineArr[3]);
                if (Math.abs(div1) > highDiv) {
                    highDiv = Math.abs(div1);
                }
                if (Math.abs(div2) > highDiv) {
                    highDiv = Math.abs(div2);
                }
                if (Math.abs(div3) > highDiv) {
                    highDiv = Math.abs(div3);
                }
                if (firstpass) {
                    rightpoint = div1;
                    leftpoint = div1;
                    toppoint = div2;
                    bottompoint = div2;
                    nearpoint = div3;
                    farpoint = div3;
                    firstpass = false;
                }
                if (div1 > rightpoint) {
                    rightpoint = div1;
                }
                if (div1 < leftpoint) {
                    leftpoint = div1;
                }
                if (div2 > toppoint) {
                    toppoint = div2;
                }
                if (div2 < bottompoint) {
                    bottompoint = div2;
                }
                if (div3 > nearpoint) {
                    nearpoint = div3;
                }
                if (div3 < farpoint) {
                    farpoint = div3;
                }

                tempVert.push([div1, div2, div3]);
                ++indCnt;
            }
        }
        else if (line.length > 2 && line.charAt(0) == "v"
            && line.charAt(1) == "n" && line.charAt(2) == " ") {
            lineArr = line.split(regExp2);
            if (lineArr.length == 4) {
                norms.push(vec3(-Number(lineArr[1]), -Number(lineArr[2]), -Number(lineArr[3])));
                ++norm_indCnt;
            }
        }
        else if ((line.length > 1 && line.charAt(0) == "f" && line.charAt(1) == " ") ||
            (line.length > 2 && line.charAt(0) == "f" && line.charAt(1) == "o" && line.charAt(2) == " ")) {
            lineArr = line.split(regExp2);
            if (lineArr.length >= 4) {
                indSet = [];
                norm_indSet = [];
                hasNorm = false;
                for (var r = 1; r < lineArr.length; ++r) {
                    wordArr = lineArr[r].split("/");
                    if (wordArr.length > 0) {
                        indNum = Number(wordArr[0]);

                        if (wordArr.length > 2) {
                            hasNorm = true;
                            norm_indNum = Number(wordArr[2]);

                            if (norm_indNum > 0) {
                                --norm_indNum;
                            } else {
                                norm_indNum = norm_indCnt + norm_indNum;
                            }
                            norm_indSet.push(norm_indNum);
                        }
                    }
                    else {
                        indNum = Number(wordArr);
                    }
                    if (indNum > 0) {
                        --indNum;
                    } else {
                        indNum = indCnt + indNum;
                    }
                    indSet.push(indNum);
                }
                if (indSet.length == 3) {
                    indices.push(indSet);
                    if (hasNorm) {
                        norm_indices.push(norm_indSet);
                    }
                    vCnt += 3;
                }
                else {
                    for (var s = 0; s < indSet.length - 2; ++s) {
                        indices.push([indSet[0], indSet[s + 1], indSet[s + 2]]);
                        if (hasNorm) {
                            norm_indices.push([norm_indSet[0], norm_indSet[s + 1], norm_indSet[s + 2]]);
                        }
                        vCnt += 3;
                    }
                }
            }
        }
    }
    numMeshes = indices.length;

    xshift = (rightpoint - leftpoint) / 2;
    yshift = (toppoint - bottompoint) / 2;
    zshift = (nearpoint - farpoint) / 2;
    for (var t = 0; t < tempVert.length; ++t) {
        div1 = Number(tempVert[t][0]);
        div2 = Number(tempVert[t][1]);
        div3 = Number(tempVert[t][2]);

        div1 -= leftpoint + xshift;
        div2 -= bottompoint + yshift;
        div3 -= farpoint + zshift;

        vertices.push(vec3((div1 / highDiv), (div2 / highDiv), (div3 / highDiv)));
    }
}

function makemesh() {
    var t1, t2, normal;

    hasNorms = (indices.length == norm_indices.length);
    for (var a = 0; a < numMeshes; ++a) {
        for (var b = 0; b < indices[a].length - 2; ++b) {
            if (!hasNorms) {
                t1 = subtract(vertices[indices[a][b]], vertices[indices[a][b + 1]]);
                t2 = subtract(vertices[indices[a][b]], vertices[indices[a][b + 2]]);
                normal = cross(t2, t1);
                normal[3] = 0;
            }
            for (var c = 0; c < 3; c++) {
                pointsArray.push(vec4(vertices[indices[a][b + c]]));
                if (!hasNorms) {
                    normalsArray.push(vec3(-normal[0],-normal[1],-normal[2]));
                }
                else {
                    normalsArray.push(vec3(
                           -norms[norm_indices[a][b + c]][0],
                           -norms[norm_indices[a][b + c]][1],
                           -norms[norm_indices[a][b + c]][2]));
                }
            }
        }
    }
}
