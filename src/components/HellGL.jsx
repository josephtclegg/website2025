import React, { useRef, useEffect } from 'react';
import hellImgSrc from '../assets/hell_large.png';
import angelImgSrc from '../assets/angel_large.png';

function HellGL() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const PI = 3.14;
    const isPowerOf2 = (n) => {
      return (n > 0 && (n & (n-1)) === 0);
    };

    const date = new Date();
    const canvas = canvasRef.current;
    const bannerVertSource = `
      precision lowp float;
      attribute vec3 position;
      attribute vec2 texcoord;
      varying vec2 uv;
      void main() {
        uv = texcoord;
        gl_Position = vec4(position, 1.0);
      }
    `;
    const bannerFragSource = `
      precision lowp float;
      uniform vec2 resolution;
      uniform float time;
      uniform sampler2D texture1;
      uniform sampler2D texture2;
      varying vec2 uv;

      vec2 sinWave(vec2 p, float t) {
        p.x=(0.55*p.x)+0.5;
        p.y=(-0.55*p.y)+0.5;
        float x=sin(2.*p.y+5.*p.x+6.28*t)*0.05;
        float y=sin(3.*p.y+10.*p.x+6.28*t)*0.05;
        return vec2(p.x+x, p.y+y);
      }

      mat2 rotate2d(float angle){
          return mat2(cos(angle),-sin(angle),
                      sin(angle),cos(angle));
      }

      vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      void main() {
        float t = time/-3.0;
        float hue = mod(time*2., 12.0) / 12.0;
        vec3 hsv = vec3(hue, 1.0, 1.0);
        vec4 rainbow = vec4(hsv2rgb(hsv), 1.0);
        vec2 st = uv.xy*-3.;
        vec2 st2 = uv.xy*-3.;
        st2.y += t;
        vec4 texcolor = texture2D(texture1, vec2(sinWave(st, t).x, uv.y));
        vec4 texcolor2 = texture2D(texture2, sinWave(st2, t));
        vec4 tex12 = vec4(
          texcolor.rgb * texcolor.a + texcolor2.rgb * (1.0 - texcolor.a),
          texcolor.a + texcolor2.a * (1.0 - texcolor.a)
        );
        vec4 finalcolor = vec4(
          tex12.rgb * tex12.a + rainbow.rgb * (1.0 - tex12.a),
          tex12.a + rainbow.a * (1.0 - tex12.a)
        );
        gl_FragColor = finalcolor;
      }
    `;
    function createBanner() {
      const positions = [-1.0, 1.0, 0.0,  //top left
                         -1.0,-1.0, 0.0,  //bot left
                          1.0,-1.0, 0.0,  //bot right
                          1.0, 1.0, 0.0]  //top right
      const texcoords = [ 0.0, -1.0,  //top left
                          0.0,  0.0,  //bot left
                          1.0,  0.0,  //bot right
                          1.0, -1.0]; //top right
      const position_indices = [0, 1, 2,
                                2, 3, 0];
      const uv_indices = position_indices;
      const position_data = position_indices.flatMap((n) => [positions[3*n], positions[3*n+1], positions[3*n+2]]);
      const uv_data = uv_indices.flatMap((n) => [texcoords[2*n], texcoords[2*n+1]]);
      const banner = {
        getPositionData() {
            return position_data;
        },
        getUvData() {
            return uv_data;
        },
        numVertices() {
          return position_data.length/3;
        }
      };

      return banner;
    };

    const gl = canvas.getContext('webgl', {alpha: true});
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    //WebGL initialization stuff
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    //Create banner shader program
    const bannerVert = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(bannerVert, bannerVertSource);
    gl.compileShader(bannerVert);
    const bannerFrag = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(bannerFrag, bannerFragSource);
    gl.compileShader(bannerFrag);
    const bannerShader = gl.createProgram();
    gl.attachShader(bannerShader, bannerVert);
    gl.attachShader(bannerShader, bannerFrag);
    gl.linkProgram(bannerShader);
    gl.useProgram(bannerShader);

    //Get banner shader attribute/uniform locations
    const bannerPositionAttribLocation = gl.getAttribLocation(bannerShader, 'position');
    const bannerResolutionUniformLocation = gl.getUniformLocation(bannerShader, 'resolution');
    const bannerTimeUniformLocation = gl.getUniformLocation(bannerShader, 'time');
    const bannerTexcoordAttribLocation = gl.getAttribLocation(bannerShader, 'texcoord');
    const bannerTex1Location = gl.getUniformLocation(bannerShader, 'texture1');
    const bannerTex2Location = gl.getUniformLocation(bannerShader, 'texture2');
    //Create buffers
    const bannerPositionBuffer = gl.createBuffer();
    const bannerTextureBuffer = gl.createBuffer();
    const angelTextureBuffer = gl.createBuffer();

    //Set uniforms
    gl.uniform2f(bannerResolutionUniformLocation, canvas.width, canvas.height);
    gl.uniform1i(bannerTex1Location, 0);
    gl.uniform1i(bannerTex2Location, 1);

    //Create texture
    gl.bindBuffer(gl.ARRAY_BUFFER, bannerTextureBuffer);
    gl.enableVertexAttribArray(bannerTexcoordAttribLocation);
    gl.vertexAttribPointer(bannerTexcoordAttribLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([]), gl.STATIC_DRAW);
    const bannerTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, bannerTexture);
    //Fill the texture with placeholder value
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

    //Asynchronously load an image
    let hellImage = new Image();
    hellImage.src = hellImgSrc;
    hellImage.addEventListener('load', function () {
      //Copy image to the texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, bannerTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, hellImage);
      //Check if image is a power of 2 in both dimensions
      if (isPowerOf2(hellImage.width) && isPowerOf2(hellImage.height)) {
        //Yes, generate mips
        gl.generateMipmap(gl.TEXTURE_2D);
      } else {
        //No, turn off mips and set wrapping to clamp to edge
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
    });
    //Create texture
    gl.bindBuffer(gl.ARRAY_BUFFER, angelTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([]), gl.STATIC_DRAW);
    const angelTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, angelTexture);
    //Fill the texture with placeholder value
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

    //Asynchronously load an image
    let angelImage = new Image();
    angelImage.src = angelImgSrc;
    angelImage.addEventListener('load', function () {
      //Copy image to the texture
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, angelTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, angelImage);
      //Check if image is a power of 2 in both dimensions
      if (isPowerOf2(angelImage.width) && isPowerOf2(angelImage.height)) {
        //Yes, generate mips
        gl.generateMipmap(gl.TEXTURE_2D);
      } else {
        //No, turn off mips and set wrapping to clamp to edge
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
    });


    const render = () => {
      let banner = createBanner();
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.clearColor(0, 0, 0, 0.01);
      //Bind banner shader program
      gl.useProgram(bannerShader);
      //Set banner positions
      gl.bindBuffer(gl.ARRAY_BUFFER, bannerPositionBuffer);
      gl.enableVertexAttribArray(bannerPositionAttribLocation);
      gl.vertexAttribPointer(bannerPositionAttribLocation, 3, gl.FLOAT, false, 0, 0);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(banner.getPositionData()), gl.STATIC_DRAW);
      //Set banner texture
      gl.bindBuffer(gl.ARRAY_BUFFER, bannerTextureBuffer);
      gl.enableVertexAttribArray(bannerTexcoordAttribLocation);
      gl.vertexAttribPointer(bannerTexcoordAttribLocation, 2, gl.FLOAT, false, 0, 0);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(banner.getUvData()), gl.STATIC_DRAW);
      //Set banner uniforms
      gl.uniform1f(bannerTimeUniformLocation, performance.now()/4096);
      //Draw banner
      gl.drawArrays(gl.TRIANGLES, 0, banner.numVertices());
      requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(render);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width ={2048}
      height={2048}
      style={{}}
    />
  );
}

export default HellGL;
