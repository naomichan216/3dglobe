$(document).ready(function(){

	$("body").append("<div id='globe-lightbox'>"
		+ "<div class='box'>"
			+ "<div class='content'>"
				+ "</div>"
				+ "<div class='bar'>"
					+ "<a class='close-button'><span>CLOSE</span><span class='x'>×</span></a>"
				+ "</div>"
			+ "</div>"
		+ "</div>");

    $("#globe-lightbox .close-button").click(function(){
	    $("#globe-lightbox").hide();
    });
    
});