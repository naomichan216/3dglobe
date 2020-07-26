/************************/
/**    3D VARIABLES    **/
/************************/
var scene, backScene, camera, renderer, control, raycaster;
var globe, poiContainer, backPoiContainer, poi3DSpheres, focusedPoi3DSphere;
var worldContainer, backWorldContainer;
var globeCanvas;
var poiSphereGeometry, poiLineGeometry, poiLineStrokeGeometry, poiShadowMaterial, poiLineFillMaterial, poiLineStrokeMaterial;
var poiByID;

/***********************/
/*    !UI VARIABLES    */
/***********************/
var resetButton;
var globeElement;
var poiLabelElement;
var labelManager;
var globeReader;
var currentEntry;

/*********************/
/*    !CONSTANTS     */
/*********************/

var VERBOSE = false;
var GLOBE_RADIUS = 550;
var DEFAULT_ROTATION_SPEED = 0.0015;
var POI_RADIUS_RATIO = 0.015;
var POI_HEIGHT_RATIO = 0.235;

/***************************************/
/*     !LOAD & ANIMATION VARAIBLES     */
/***************************************/
var animationVariables = {
	frame: 0,
	currentRotationSpeed: DEFAULT_ROTATION_SPEED,
	autoRotation: true
};

var loadedTexturesCount = 0;
var texturesToLoadCount;

function getWebGLAvailibility() {
	try {
		return !! window.WebGLRenderingContext && !! document.createElement( 'canvas' ).getContext( 'experimental-webgl' );
	}
	catch( e ) {
		return false;
	}
}

var isAvailableWEBGL = getWebGLAvailibility();

function initConfiguration(){
	globeElement = $("#globe");
	if(!globeElement){
		alert("An element with id='globe' was not found!"); 
		return false;
	}
	
	poiByID = new Array ();
	
	globeReader = $("#globe-reader");
	poiLabelElement = $("#globe-poi-label:eq(0)");

	// animation speed
	var animationSpeedAttr = globeElement.attr("animation-speed");
	if(animationSpeedAttr){
		currentAnimationSpeed = parseFloat(animationSpeedAttr);
		
		animationVariables.currentRotationSpeed = DEFAULT_ROTATION_SPEED * currentAnimationSpeed;
		
		
	}

	// set radius
	var radiusAttr = globeElement.attr("radius");
	if(radiusAttr){
		GLOBE_RADIUS = parseInt(radiusAttr);
	}
	
	// set textures directory
	var texturesDirectoryAttr = globeElement.attr("textures-directory");
	if(texturesDirectoryAttr){
		TEXTURES_DIRECTORY = texturesDirectoryAttr;
	}


	return globeElement;
}

function createDomElements(){
	if(!isAvailableWEBGL) return;
	
	var preloaderSource = "<div id='globe-preloader'><img src='https://upload.wikimedia.org/wikipedia/commons/9/90/Globe-preloader.gif' alt='preloader' width='32' height='32'>"
		+ "<br>"
		+ "<span>loading…</span>"
		+ "</div>";
	
	var autoRotateButtonSource = "<div id='globe-reset-button' class='hidden'>"
		+ "<img src='https://upload.wikimedia.org/wikipedia/commons/4/44/Reset_icon.png' alt='Reset icon'>"
		+ "</div>";
		
	var shadowSource = "<img id='globe-shadow' src=''/>"
	
	var poiLabelSource = "<div id='globe-poi-label'>"
		+ "<span>Cape of Good Hope</span>"
		+ "<div class='arrow'></div>"
		+ "</div>"
	
	globeElement.append(preloaderSource);
	globeElement.append(shadowSource);
	globeElement.append(autoRotateButtonSource);
	globeElement.append(poiLabelSource);
}

/******************************/
/*    !THREE JS (shaders)     */
/******************************/

THREE.EarthShader = {
	
		uniforms: THREE.UniformsUtils.merge( [

			THREE.UniformsLib[ "common" ],
		
			THREE.UniformsLib[ "normalmap" ],
			
			THREE.UniformsLib[ "lights" ],
	

			{
				"ambient"  : { type: "c", value: new THREE.Color( 0xffffff ) },
				"emissive" : { type: "c", value: new THREE.Color( 0x000000 ) },
				"specular" : { type: "c", value: new THREE.Color( 0x111111 ) },
				"shininess": { type: "f", value: 30 },
				"wrapRGB"  : { type: "v3", value: new THREE.Vector3( 1, 1, 1 ) }
			}

		] ),

		vertexShader: [
			"varying vec3 vViewPosition;",
			"varying vec3 vNormal;",

			THREE.ShaderChunk[ "map_pars_vertex" ],
			THREE.ShaderChunk[ "lightmap_pars_vertex" ],
			THREE.ShaderChunk[ "envmap_pars_vertex" ],
			THREE.ShaderChunk[ "lights_phong_pars_vertex" ],
			THREE.ShaderChunk[ "color_pars_vertex" ],
			THREE.ShaderChunk[ "morphtarget_pars_vertex" ],
			THREE.ShaderChunk[ "skinning_pars_vertex" ],
			THREE.ShaderChunk[ "shadowmap_pars_vertex" ],

			"void main() {",

				THREE.ShaderChunk[ "map_vertex" ],
				THREE.ShaderChunk[ "lightmap_vertex" ],
				THREE.ShaderChunk[ "color_vertex" ],

				THREE.ShaderChunk[ "morphnormal_vertex" ],
				THREE.ShaderChunk[ "skinbase_vertex" ],
				THREE.ShaderChunk[ "skinnormal_vertex" ],
				THREE.ShaderChunk[ "defaultnormal_vertex" ],

				"vNormal = normalize( transformedNormal );",

				THREE.ShaderChunk[ "morphtarget_vertex" ],
				THREE.ShaderChunk[ "skinning_vertex" ],
				THREE.ShaderChunk[ "default_vertex" ],

				"vViewPosition = -mvPosition.xyz;",

				THREE.ShaderChunk[ "worldpos_vertex" ],
				THREE.ShaderChunk[ "envmap_vertex" ],
				THREE.ShaderChunk[ "lights_phong_vertex" ],
				THREE.ShaderChunk[ "shadowmap_vertex" ],

			"}"

		].join("\n"),

		fragmentShader: [
			"#extension GL_OES_standard_derivatives : enable",
			
			"uniform vec3 diffuse;",
			"uniform float opacity;",

			"uniform vec3 ambient;",
			"uniform vec3 emissive;",
			"uniform vec3 specular;",
			"uniform float shininess;",

			THREE.ShaderChunk[ "color_pars_fragment" ],
			THREE.ShaderChunk[ "map_pars_fragment" ],
			THREE.ShaderChunk[ "lightmap_pars_fragment" ],
			THREE.ShaderChunk[ "envmap_pars_fragment" ],
			THREE.ShaderChunk[ "fog_pars_fragment" ],
			THREE.ShaderChunk[ "lights_phong_pars_fragment" ],
			THREE.ShaderChunk[ "shadowmap_pars_fragment" ],

			//THREE.ShaderChunk[ "bumpmap_pars_fragment" ],
			
	
			THREE.ShaderChunk[ "normalmap_pars_fragment" ],
			THREE.ShaderChunk[ "specularmap_pars_fragment" ],

			"void main() {",

				"gl_FragColor = vec4( vec3 ( 1.0 ), opacity );",

				THREE.ShaderChunk[ "map_fragment" ],
				THREE.ShaderChunk[ "alphatest_fragment" ],
				THREE.ShaderChunk[ "specularmap_fragment" ],

				THREE.ShaderChunk[ "lights_phong_fragment" ],

				THREE.ShaderChunk[ "lightmap_fragment" ],
				THREE.ShaderChunk[ "color_fragment" ],
				THREE.ShaderChunk[ "envmap_fragment" ],
				THREE.ShaderChunk[ "shadowmap_fragment" ],

				THREE.ShaderChunk[ "linear_to_gamma_fragment" ],

				THREE.ShaderChunk[ "fog_fragment" ],

			"}"

		].join("\n")

}

THREE.ConnectionShader = {

		vertexShader: [
		
		].join("\n"),

		fragmentShader: [
		
		].join("\n")

}

/********************/
/*    !THREE JS     */
/********************/



function initThree() {
	var globeElementW = globeElementH = Math.min(globeElement.width(), globeElement.height());
	
	globeCanvas = $("<canvas></canvas>");
	globeCanvas.width( globeElementW );
	globeCanvas.height( globeElementH );
	globeElement.prepend(globeCanvas);
	
	// scene & camera
	scene = new THREE.Scene();
	backScene = new THREE.Scene();
	raycaster = new THREE.Raycaster();

	camera = new THREE.PerspectiveCamera( 10, globeElementW / globeElementH, 1, 10000 );
	camera.position.z = -7000;
	
	if (isAvailableWEBGL) {
		if(VERBOSE) console.log("WEB_GL detected");
		renderer = new THREE.WebGLRenderer({
			canvas: globeCanvas.get(0),
			antialias: true,
			alpha: true,
			autoClear: false,
		});		
		
		renderer.autoClear = false;
		renderer.clear();
		renderer.setClearColor(0x000000, 0);
		renderer.setSize( globeElementW, globeElementH );
		
		texturesToLoadCount = 1;
	}  
	else{
		globeElement.prepend("WebGL is not available. Please update your browser or drivers for your video card!");
		globeElement.addClass("no-webgl");
	}
	
	return true;
}

function collectUIElements(){
	resetButton = document.getElementById("globe-reset-button");
}

function initLights(){		
	scene.add(new THREE.AmbientLight(0xffffff));
}

function initChildren() {
	
	worldContainer = new THREE.Object3D();
	backWorldContainer = new THREE.Object3D();
	poiContainer = new THREE.Object3D();
	backPoiContainer = new THREE.Object3D();
	
	poi3DSpheres = [];
	
	var sphereGeometry;
	
	if(isAvailableWEBGL){
		sphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS , 64, 48);
	}
	else{
		sphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS , 32, 24);
	}
	
	if (isAvailableWEBGL) {
		initGlobe(sphereGeometry);
	
	}
	else{
		initGlobeSoftware(sphereGeometry);
	}
	
	initPoi3D();
	initConnections3D();
}

function initGlobe(sphereGeometry){
	globe = new THREE.Mesh( sphereGeometry, makeCustomEarthMaterial() );
	worldContainer.add( globe );
}




function makeCustomEarthMaterial(){
	var uniforms = THREE.EarthShader.uniforms;	
	THREE.ImageUtils.crossOrigin = '';
    uniforms.map.value = THREE.ImageUtils.loadTexture("https://upload.wikimedia.org/wikipedia/commons/0/09/Black-01-01-01.png", THREE.UVMapping, textureOnLoad);
	
	
	
	//custom !!!
	var defines = {};
	defines[ "PHONG" ] = "";
	defines[ "USE_MAP" ] = "";
	defines[ "USE_SPECULARMAP" ] = "";
	
	
	return new THREE.ShaderMaterial({
		uniforms: uniforms,
		vertexShader: THREE.EarthShader.vertexShader,
		fragmentShader: THREE.EarthShader.fragmentShader,
		lights: true,
		defines: defines
		
	});
}

function initControls(){
	controls = new THREE.OrbitControls( camera, globeCanvas.get(0) );
	controls.noKeys = true;
	controls.noZoom = true;
	controls.rotateSpeed = 0.5;
}

function animate() {

	requestAnimationFrame( animate );
	controls.update();
	
	if(isAvailableWEBGL){
		if(globe){
			globe.rotation.y += animationVariables.currentRotationSpeed;
		}
	
		
		if(poiContainer){
			poiContainer.rotation.y += animationVariables.currentRotationSpeed;
		}
		
		if(backPoiContainer){
			backPoiContainer.rotation.y += animationVariables.currentRotationSpeed;
		}
	}

	var sPos = new THREE.Vector3( 5000, 0, 0 );
	camera.localToWorld(sPos);
	animationVariables.frame += 1;
	render();

}

function render() {
	if(!renderer) return;
	
	renderer.clear();
	renderer.render( backScene, camera );
	renderer.clearDepth();
	renderer.render( scene, camera );
}

function textureOnLoad(t){
	loadedTexturesCount++;
	
	if(texturesToLoadCount==loadedTexturesCount){
		if(VERBOSE) console.log("All textures has been loaded.");
		
		document.getElementById("globe-shadow").style.display = "block";
		scene.add(worldContainer);
		backScene.add(backWorldContainer);
		worldContainer.add(poiContainer);
		backWorldContainer.add(backPoiContainer);
		
		var globePreloaderElement = document.getElementById("globe-preloader");
		if(globePreloaderElement){
			globePreloaderElement.style.display = "none";
			enableMouseInteraction();
		}
	}
}

function calc2DPoint(worldVector){
	var vector = worldVector.clone();
    vector.project(camera);
    
    var halfWidth = this.renderer.domElement.width / 2;
    var halfHeight = this.renderer.domElement.height / 2;
    return {
        x: Math.round(vector.x * halfWidth + halfWidth),
        y: Math.round(-vector.y * halfHeight + halfHeight)
    };
}

/******************************/
/*    !THREE POI & POIDATA    */
/******************************/

function PoiData(id, latitude, longitude, label, color, action, actionParameter, html){
	this.id = id;
	this.latitude = latitude;
	this.longitude = longitude;
	this.label = label;
	this.color = typeof color !== 'undefined' ? color : 0xffffff;
	this.html = typeof html !== 'undefined' ? html : '';
	
	this.action = typeof action !== 'undefined' ? action : "callback";
	this.actionParameter = typeof actionParameter !== 'undefined' ? actionParameter : null;
}

function initPoi3D(){
	var elements = $("#globe .poi");
	
	$.each(elements, function(index, value) {
		var idAttr = $(value).attr("id");
		var latitudeAttr = $(value).attr("latitude");
		var longitudeAttr = $(value).attr("longitude");
		var labelAttr = $(value).attr("label");
		var action = $(value).attr("action");
		var actionParameter = $(value).attr("action_parameter");
		var html = $(value).html();

		
		var poiColor = $(value).attr("color");
		if(poiColor) poiColor = parseInt(poiColor.replace("#","0x"));
		
		if(latitudeAttr && longitudeAttr){
			var poiData = new PoiData(idAttr, latitudeAttr, longitudeAttr, labelAttr, poiColor, action, actionParameter, html);
			addPoi(poiData);
			poiByID[poiData.id] = poiData;
		}
	});
	
}

function createPoiMaterialsAndGeometries(){
	if(!poiSphereGeometry) poiSphereGeometry = new THREE.SphereGeometry( GLOBE_RADIUS * POI_RADIUS_RATIO , 16, 12 );
	if(!poiLineGeometry) poiLineGeometry = new THREE.CylinderGeometry(
		GLOBE_RADIUS*POI_RADIUS_RATIO*0.01,
		GLOBE_RADIUS*POI_RADIUS_RATIO*0.05,
		GLOBE_RADIUS*POI_HEIGHT_RATIO,
		8
	);
	if(!poiLineStrokeGeometry) poiLineStrokeGeometry = new THREE.CylinderGeometry(
		GLOBE_RADIUS*POI_RADIUS_RATIO*0.01*1.333,
		GLOBE_RADIUS*POI_RADIUS_RATIO*0.05*1.333,
		GLOBE_RADIUS*POI_HEIGHT_RATIO,
		8
	);	
	
	
	if(!poiLineFillMaterial){
		poiLineFillMaterial = new THREE.MeshBasicMaterial( { color: 0xFFFFFF } );
	}
	
	if(!poiLineStrokeMaterial){
		poiLineStrokeMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff, depthTest: false, depthWrite: false} );
	}
}

function addPoi(poiData){
	createPoiMaterialsAndGeometries();
	
	var poi3D = new THREE.Object3D();
	poi3D.poiData = poiData;
	poi3D.rotation.set(0, Math.PI*poiData.longitude/180, Math.PI*poiData.latitude/180);
	poi3D.updateMatrix();
	
	var backPoi3D = poi3D.clone();
	
	// sphere	
	var sphere = new THREE.Mesh(
		poiSphereGeometry,
		new THREE.MeshPhongMaterial( {color: 0xFFFFFFF})
	);

	sphere.position.set(GLOBE_RADIUS*(1+POI_HEIGHT_RATIO), 0, 0);
	sphere.name = "poi";
	poi3D.add( sphere );
	
	// line 
	var lineFill = new THREE.Mesh( poiLineGeometry, poiLineFillMaterial );
	lineFill.position.set(GLOBE_RADIUS*(1+POI_HEIGHT_RATIO*0.5), 0, 0);
	lineFill.rotation.set(0, 0, Math.PI*0.5);
	lineFill.updateMatrix();
	poi3D.add( lineFill );
	
	var lineStroke = new THREE.Mesh( poiLineStrokeGeometry, poiLineStrokeMaterial );
	lineStroke.position.set(GLOBE_RADIUS*(1 +POI_HEIGHT_RATIO*0.5), 0, 0);
	lineStroke.rotation.set(0, 0, Math.PI*0.5);
	lineStroke.updateMatrix();
	backPoi3D.add( lineStroke);

	poiContainer.add(poi3D);
	backPoiContainer.add( backPoi3D );
	poi3DSpheres.push(sphere);
	
	return poiData;
}

/**********************/
/*    !CONNECTIONS    */
/**********************/

function initConnections3D(){
	if(VERBOSE) console.log("initConnections3D()");
	var elements = globeElement.find(".connection");
	
	$.each(elements, function(index, value) {
		var fromID = $(value).attr("fromPoi");
		var toID = $(value).attr("toPoi");
		
		var connectionColor = $(value).attr("color");
		if(connectionColor) connectionColor = parseInt(connectionColor.replace("#","0x"));
						
		if( fromID && toID ){
			addConnection(new ConnectionData(fromID, toID, connectionColor));
		}
	});
}

/************************/
/*     !INTERACTION     */
/************************/

function enableMouseInteraction(){
	$.extend(jQuery.easing, {
		customBackEasing: function (x, t, b, c, d, s) {
			if (s == undefined) s = 4;
			return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
		}	
	});

	labelManager = new LabelManager($("#globe-poi-label:eq(0)"), globeElement);

	globeCanvas.mousedown(function(event){
		animationVariables.autoRotation = false;
		animationVariables.currentRotationSpeed = 0;
		
		
		if(resetButton){
			resetButton.classList.remove("hidden");
		}
		
		labelManager.hideLabel();
	});
	
	globeCanvas.mousemove(function(event){
		if(animationVariables.autoRotation) return;
		
		var poi3DSphere = getFirstPoiUnderMouseCursor(event);

		if(poi3DSphere){
			if(focusedPoi3DSphere != poi3DSphere){
				if(focusedPoi3DSphere) $(focusedPoi3DSphere.scale).stop().animate({x:1.0, y:1.0, z:1.0}, 300, "customBackEasing");
				focusedPoi3DSphere = poi3DSphere;
				
				$(focusedPoi3DSphere.scale).stop().animate({x:1.25, y:1.25, z:1.25}, 300, "customBackEasing");
				
				onPoi3DOver(event);
			}
		}
		else{
			if(focusedPoi3DSphere){
				$(focusedPoi3DSphere.scale).stop().animate({x:1.0, y:1.0, z:1.0}, 300, "customBackEasing");
				focusedPoi3DSphere = null;	
			} 
			
			labelManager.hideLabel();
		}
	});
	
	globeCanvas.click(function(event){
		if(animationVariables.autoRotation) return;
		
		var poi3DSphere = getFirstPoiUnderMouseCursor(event);

		if(poi3DSphere){
			onPoi3DClick(poi3DSphere.parent.poiData);
		}
	});
	
	//globeCanvas.click(onPoi3DOver);
		
	if(resetButton){
		resetButton.onclick = onResetButtonClick;
	}
}

function getFirstPoiUnderMouseCursor(event){
	event.preventDefault();

    var canvasRect = globeCanvas.get(0).getBoundingClientRect();
    var mouseX = event.clientX - canvasRect.left;
    var mouseY = event.clientY - canvasRect.top;
    
    var vector = new THREE.Vector3( 2*(mouseX/canvasRect.width) - 1 , -2*(mouseY/canvasRect.height) + 1, 1 );
	vector.unproject( camera );

	raycaster.set( camera.position, vector.sub( camera.position ).normalize() );

	var intersectedObjects = raycaster.intersectObjects( worldContainer.children, true );
	
	if(intersectedObjects.length == 0) return null;
	
	if(intersectedObjects[0].object.name == "poi"){
		return intersectedObjects[0].object;
	}
	
	return null;
}

function onResetButtonClick(){
	resetAutoRotation();
	resetButton.classList.add("hidden");
	
	labelManager.hideLabel();
}

function resetAutoRotation(){
	console.log("resetAutoRotation");

	$(animationVariables).animate({
		currentRotationSpeed: DEFAULT_ROTATION_SPEED * currentAnimationSpeed,
		
	}, 1000, "linear");
	
	animationVariables.autoRotation = true;
}

function onPoi3DOver(event, poi3DSphere){
	if(!poi3DSphere) poi3DSphere = getFirstPoiUnderMouseCursor(event);

	if(poi3DSphere){
		var poiData = poi3DSphere.parent.poiData;
		if(!poiData.label) return;
		
		var spherePos = poi3DSphere.position.clone();
		poi3DSphere.parent.localToWorld(spherePos);
		
		var poi2DCoordinates = calc2DPoint(spherePos);
		
		if(poiLabelElement){
			labelManager.showLabel(poiData.label, poi2DCoordinates);
		}
	}
}

function onPoi3DClick(poiData){
	
	switch(poiData.action){
		case "js":
			eval(poiData.actionParameter);
			break;
			
		case "link":
			open(poiData.actionParameter);
			break;
				
		case "callback":
			
			var fn = window[poiData.actionParameter];
			if(typeof fn === 'function') fn(poiData);
			break;
			
		case "image":
			$("#globe-lightbox .content").html("<img class='image' src='" + poiData.actionParameter + "'/>");
			$("#globe-lightbox").show();
			break;
			
		case "html":
			$("#globe-lightbox .content").html(poiData.html);
			$("#globe-lightbox").show();
			break;
			
		default:
			console.log(poiData);
	}
}

function defaultOnPoi3DClick(poiData){
	alert(poiData.toString());
}

/***********************/
/*    !START POINT     */
/***********************/

function initializeInteractiveEarth3D(){
	if(initConfiguration()){
		createDomElements();
		collectUIElements();
		initThree()
		//enableMouseInteraction();  <-- to jest odpalane w metodzie textureOnLoad()
		initLights();
		initChildren();
	
		initControls();
		animate();
	}
}
