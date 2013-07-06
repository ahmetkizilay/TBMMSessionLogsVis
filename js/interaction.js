$("select").change(function () {
	$("#info h2").text("TBMM " + $("select option:selected").text() + " Oturum Süreleri");

	d3.select("svg").remove();
	d3.json("data/" + $("select").val() + ".json", processData);
});