$("select").change(function () {
	$("#info h2").text("TBMM " + $("select option:selected").text() + " Oturum Süreleri");

	donem = $("select option:selected").text().substring(0,2)
	yasamayili = $("select option:selected").text().substring(10,11)
	
	// d3.select("svg").transition().duration(1000).style("opacity",0).remove();
	d3.select("svg").remove();
	d3.json("data/" + $("select").val() + ".json", processData);
});