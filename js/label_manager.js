LabelManager.prototype.labelElement = null;
LabelManager.prototype.globeElement = null;

function LabelManager(labelElement, globeElement){
	this.labelElement = labelElement;
	this.globeElement = globeElement;
}

LabelManager.prototype.showLabel = function(text, poi2DCoordinates){
	if(this.labelElement){
		this.labelElement.find("span").text(text);

		var x = poi2DCoordinates.x - this.labelElement.width()*0.5;
		var y = poi2DCoordinates.y - this.labelElement.height()-10;
		
		this.labelElement.css({
			left: x,
			top: y
		});

		this.labelElement.addClass("visible");		
		
		this.globeElement.css("perspective-origin", poi2DCoordinates.x+"px "+poi2DCoordinates.y+"px");
	}
}

LabelManager.prototype.hideLabel = function(){
	if(this.labelElement){
		this.labelElement.removeClass("visible");		
	}
}