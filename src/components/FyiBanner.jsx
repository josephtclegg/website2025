import React, { useRef, useEffect, useState } from 'react';
import textImgSrc from '../assets/ghostbannertext_large.png';
import bgImgSrc from '../assets/greensmileysbanner_large.png';

function FyiBanner() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({width: 1024, height: 128});

  useEffect(() => {
    const container = containerRef.current;
    function updateSize() {
      if (!canvasRef.current) return;
      const width = window.innerWidth;
      //const width = container.clientWidth;
      setContainerSize({
        width: width,
        height: width * (128/1024) //Maintain aspect ratio
      });
    }
    updateSize();
    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect(container);
    };
  }, []);

  useEffect(() => {
    if (containerSize.width === 0) return;
    const canvas = canvasRef.current;
    const PI = 3.14;
    const date = new Date();
    let mouseX = 0;
    let mouseY = 0;
    canvas.width = containerSize.width;
    canvas.height = containerSize.height;

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
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const getMousePosition = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    };

    const getCanvasMousePosition = (e) => {
      var pos = getMousePosition(e);
      pos.x = pos.x * canvas.width / canvas.clientWidth;
      pos.y = pos.y * canvas.height / canvas.clientHeight;
      return pos;
    };

    const handleMouseMove = (e) => {
      const mouse_pos = getCanvasMousePosition(e);
      mouseX = mouse_pos.x;
      mouseY = canvas.height - mouse_pos.y;
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    const isPowerOf2 = (n) => {
      return (n > 0 && (n & (n-1)) === 0);
    };

    const bannerVertSource = `
      precision lowp float;
      attribute vec3 position;
      attribute vec2 texcoord;
      varying vec2 uv;
      void main() {
        uv = vec2(texcoord.x, -1.*texcoord.y);
        gl_Position = vec4(position, 1.0);
      }
    `;
    const bannerFragSource = `
      precision lowp float;
      uniform vec2 resolution;
      uniform vec2 mp;
      uniform float time;
      uniform sampler2D texture1;
      uniform sampler2D texture2;
      uniform float radius;
      varying vec2 uv;

      mat2 rotate2d(float angle){
          return mat2(cos(angle),-sin(angle),
                      sin(angle),cos(angle));
      }

      float dist2d(vec2 p1, vec2 p2) {
        float x_dist = p1.x - p2.x;
        float y_dist = p1.y - p2.y;
        return sqrt(x_dist * x_dist + y_dist * y_dist);
      }

      vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      void main() {
        float r = radius*32.;
        float t = time;
        vec2 st = uv;
        if (dist2d(gl_FragCoord.xy, mp) < r) {
          st = rotate2d(dist2d(gl_FragCoord.xy, mp)/r/2.)*st;
        }
        float hue = mod((gl_FragCoord.x/512.)+time/2., 8.0) / 8.0;
        vec3 hsv = vec3(hue, 1.0, 1.0);
        vec4 rainbow = vec4(hsv2rgb(hsv), 1.0);
        vec4 texcolor = texture2D(texture1,  vec2(st.x, st.y+sin(16.*st.x+t)/16.));
        vec4 texcolor2 = texture2D(texture2, st);
        vec4 tex12 = vec4(
          texcolor.rgb * texcolor.a + texcolor2.rgb * (1.0 - texcolor.a),
          texcolor.a + texcolor2.a * (1.0 - texcolor.a)
        );
        vec4 texrainbow = vec4(
          tex12.rgb * tex12.a + rainbow.rgb * (1.0 - tex12.a),
          tex12.a + rainbow.a * (1.0 - tex12.a)
        );
        gl_FragColor = texrainbow;
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
    const bannerMpUniformLocation = gl.getUniformLocation(bannerShader, 'mp');
    const bannerRadiusUniformLocation = gl.getUniformLocation(bannerShader, 'radius');
    //Create buffers
    const bannerPositionBuffer = gl.createBuffer();
    const textTextureBuffer = gl.createBuffer();
    const bgTextureBuffer = gl.createBuffer();

    //Set uniforms
    gl.uniform2f(bannerResolutionUniformLocation, canvas.width, canvas.height);
    gl.uniform1i(bannerTex1Location, 0);
    gl.uniform1i(bannerTex2Location, 1);

    //Create texture
    gl.bindBuffer(gl.ARRAY_BUFFER, textTextureBuffer);
    gl.enableVertexAttribArray(bannerTexcoordAttribLocation);
    gl.vertexAttribPointer(bannerTexcoordAttribLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([]), gl.STATIC_DRAW);
    const textTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textTexture);
    //Fill the texture with placeholder value
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));

    //Asynchronously load an image
    let textImage = new Image();
    textImage.src = textImgSrc;
    textImage.addEventListener('load', function () {
      //Copy image to the texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textImage);
      //Check if image is a power of 2 in both dimensions
      if (isPowerOf2(textImage.width) && isPowerOf2(textImage.height)) {
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
    gl.bindBuffer(gl.ARRAY_BUFFER, bgTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([]), gl.STATIC_DRAW);
    const bgTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, bgTexture);
    //Fill the texture with placeholder value
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));

    //Asynchronously load an image
    let bgImage = new Image();
    bgImage.src = bgImgSrc;
    bgImage.addEventListener('load', function () {
      //Copy image to the texture
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, bgTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bgImage);
      //Check if image is a power of 2 in both dimensions
      if (isPowerOf2(bgImage.width) && isPowerOf2(bgImage.height)) {
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
      gl.bindBuffer(gl.ARRAY_BUFFER, textTextureBuffer);
      gl.enableVertexAttribArray(bannerTexcoordAttribLocation);
      gl.vertexAttribPointer(bannerTexcoordAttribLocation, 2, gl.FLOAT, false, 0, 0);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(banner.getUvData()), gl.STATIC_DRAW);
      //Set banner uniforms
      gl.uniform1f(bannerTimeUniformLocation, performance.now()/4096);
      gl.uniform1f(bannerRadiusUniformLocation, containerSize.height);
      gl.uniform2f(bannerMpUniformLocation, mouseX, mouseY);
      //Draw banner
      gl.drawArrays(gl.TRIANGLES, 0, banner.numVertices());
      requestAnimationFrame(render);
    };
    const animationId = requestAnimationFrame(render);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, [containerSize]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        position: 'relative'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: containerSize.width,
          height: '100%',
          display: 'block'
        }}
      />
    </div>
  );
}

export default FyiBanner;
