THREE.ConnectionCurve = THREE.Curve.create(

	function ( pointFrom, pointTo, radius ) {
		this.pointFrom = pointFrom;
		this.pointTo = pointTo;
		this.radius = radius;
	},

	function ( t ) {
		var p = new THREE.Vector3();
		p.copy(this.pointFrom).lerp(this.pointTo, t);
		p.normalize().multiplyScalar(this.radius);
		
		return p;
	}

);