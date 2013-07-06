
var data = [];

var margin = {top: 40, right: 100, bottom: 30, left: 40},
    width = 3500 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom;

var parseDate = d3.time.format("%d-%m-%Y, %a").parse;
var parseTime = d3.time.format("%H.%M").parse;
var formatDate = d3.time.format("%d-%m-%Y, %a"),
    formatTime = d3.time.format("%H:%M"),
    formatMinutes = function(d) { return formatTime(new Date(2012, 0, 1, 10, d)); };

var color = d3.scale.category10();

var x = d3.time.scale()
    .range([0, width]);

var y = d3.scale.linear()
    .range([0, height]);    

var r = d3.scale.sqrt()
    .range([0.5, 15]);        

d3.json("data/oturum-24.3.json", processData);

function calculateDurationInMins(from, to) {
  var fromParts = from.split('.');
  var toParts = to.split('.');
  var toPartH = parseInt(toParts[0]);
  var toPartM = parseInt(toParts[1]);
  var fromPartH = parseInt(fromParts[0]);
  var fromPartM = parseInt(fromParts[1]);
  
  if(toPartM < fromPartM) {
        toPartM = toPartM + 60;
        toPartH = toPartH - 1;
  }

  if(toPartH < fromPartH) {
    toPartH = toPartH + 24;
  }
  
  return ((toPartH - fromPartH) * 60) + (toPartM - fromPartM);
}

function simpleTimeFormat(timeToFormat) {
  var hours = timeToFormat.getHours();
  var minutes = timeToFormat.getMinutes();
  if(hours < 10) { hours = '0' + hours; }
  if(minutes < 10) { minutes = '0' + minutes; }

  return hours + '.' + minutes;
}

function processData (raw) {
	data = raw;
	draw();
}

function draw () {
	update();
}

function update () {


var xAxis = d3.svg.axis()
    .scale(x)
    .ticks(d3.time.days, 1)
    .orient("top")
    .tickFormat(d3.time.format("%d %b"));

var yAxis = d3.svg.axis()
    .scale(y)
    // .ticks(1440)
    .orient("left")
    // .tickFormat(d3.time.format("%H:%M"));
    .tickFormat(formatMinutes);

var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var earliestTime = parseTime("24.00");
  data.forEach(function(d) {
    try {
      d.oturumlar.forEach(function(e) {
        if(!e.kapali) {          
          var thisBaslangicTime = parseTime(e.baslangic);
          if(thisBaslangicTime < earliestTime) {
            earliestTime = thisBaslangicTime;
          }
          throw "BreakException";
        }        
      });
    }
    catch(exp) {
      if(exp !== "BreakException") throw exp;
    }
  });

  var earliestTimeStr = simpleTimeFormat(earliestTime);
  

  // setting session duration and offset for all except closed sessions
  data.forEach(function (d) {
    d.date = parseDate(d.tarih);
    
    d.oturumlar.forEach(function (e) {
      if(!e.kapali) {
        e.sessionDuration = calculateDurationInMins(e.baslangic, e.bitis);
        e.sessionOffset = calculateDurationInMins(earliestTimeStr, e.baslangic);
      }
      else {
        e.sessionDuration = 0;
        e.sessionOffset = 0;
      }

      e.date = d.date;
    });
  });

  // setting duration and offset for only closed sessions
  data.forEach(function (d) {
    var inx, oLen = d.oturumlar.length;
    for(inx = 0; inx < oLen; ++inx) {
      var o = d.oturumlar[inx];
      if(o.kapali) {
        if(inx != 0) {
          o.sessionOffset = d.oturumlar[inx -1].sessionOffset + d.oturumlar[inx -1].sessionDuration;
        }
        else {
          o.sessionOffset = 0;
        }
        if(inx != (oLen - 1)) {
          var oNext = d.oturumlar[inx + 1];
          if(oNext.kapali) {
            o.sessionDuration = 10; // if next session is closed, set duration to 10 by def.
          }
          else {
            o.sessionDuration = oNext.sessionOffset - o.sessionOffset - 3;
          }
        }
        else {
          o.sessionDuration = 1440 - o.sessionOffset;
        }
      }
    }
  });

  // x.domain(d3.extent(data, function(d) { return d.date; }));
  var xDomainMax = d3.time.day.offset(new Date(parseDate(data[data.length - 1].tarih)), 1);
  var xDomainMin = d3.time.day.offset(new Date(parseDate(data[0].tarih)), -1);
  x.domain([xDomainMin, xDomainMax]);
  y.domain([0, d3.max(data, function(j) { return d3.max(j.oturumlar, function(d) { return d.sessionOffset; })})])
  // y.domain([0, 1440]);

  svg.append("g")
      .attr("class", "x axis")
      // .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .selectAll("text")  
      .style("text-anchor", "end")
      .attr("dx", "4em")
      .attr("dy", "1.2em")
      .attr("transform", function(d) { return "rotate(-90)" });;

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      // .text("Saat)");

   var oturum = svg.selectAll(".oturumlar")
      .data(data)
    .enter().append("g")
      .attr("class", "oturumlar")
      .attr("x", function(d) { return x(d.date); })

    oturum.selectAll(".oturum")
      .data(function(d){return d.oturumlar})
    .enter().append("rect")
      .attr("class", "oturum")
      .attr("x", function(d) { 
        // console.log(d);
        return x(d.date) - 1.5; })
      .attr("y", function(d,i) { return y(d.sessionOffset); })
      .attr("width", 3)
      .attr("height", function(d,i) { return Math.abs(y(d.sessionDuration)); })
      .style("fill", function(d) { 
        if (d.kapali) { return "#cc0000" } return "#666"  })
      .call(d3.helper.tooltip()
        .attr("class", function(d, i) { d["tarih"] })
        .attr("d", "b")
        .text(function(d, i){
            var k =  "Evet";
            if (d.kapali) { k = "Hayir"}
        
            return "Tarih: <b>"+formatDate(d["date"]) + "</b><br>" 
            + "Saat : <b>"+d["baslangic"] + " - " +d["bitis"] + "</b><br>" 
            + "Acik Oturum: <b>"+ k + "</b><br>";
          }));

}



// Tooltip Helper from 
// https://gist.github.com/milroc/2975255
d3.helper = {};
 
d3.helper.tooltip = function(){
    var tooltipDiv;
    var bodyNode = d3.select('body').node();    
    var attrs = [];
    var text = "";
    var styles = [];
 
    function tooltip(selection) {
 
        selection.on("mouseover", function(d, i){

            var name, value;
            // Clean up lost tooltips
            d3.select('body').selectAll('div.tooltip').remove();
            // Append tooltip
            tooltipDiv = d3.select('body').append('div');
            for (var i in attrs) {
                var name = attrs[i][0];
                if (typeof attrs[i][1] === "function") {
                    value = attrs[i][1](d, i);
                } else value = attrs[i][1];
                if (name === "class") value += " tooltip";
                tooltipDiv.attr(name, value);
            }
            for (var i in styles) {
                name = styles[i][0];
                if (typeof attrs[i][1] === "function") {
                    value = styles[i][1](d, i);
                } else value = styles[i][1];
                tooltipDiv.style(name, value);
            }
            var absoluteMousePos = d3.mouse(bodyNode);
            tooltipDiv.style('left', (absoluteMousePos[0] + 20)+'px')
                .style('top', (absoluteMousePos[1] - 15)+'px')
                .style('position', 'absolute') 
                .style('z-index', 1001);
            // Add text using the accessor function
            var tooltipText = '';
            if (typeof text === "function") tooltipText = text(d, i);
            else if (typeof text != "undefined" || typeof text != null) tooltipText = text;
            // Crop text arbitrarily
            tooltipDiv
                // .style('width', function(d, i){return (tooltipText.length > 80) ? '300px' : null;})
                .html(tooltipText);
        })
        .on('mousemove', function(d, i) {
            // Move tooltip
            var absoluteMousePos = d3.mouse(bodyNode);
            tooltipDiv.style('left', (absoluteMousePos[0] + 20)+'px')
                .style('top', (absoluteMousePos[1] - 15)+'px');
            var tooltipText = '';
            if (typeof text === "string") tooltipText = text;
            if (typeof text === "function") tooltipText = text(d, i);
            tooltipDiv.html(tooltipText);
        })
        .on("mouseout", function(d, i){
            // Remove tooltip
            tooltipDiv.remove();
        });
 
    }
 
    tooltip.attr = function(name, value) {
        attrs.push(arguments);
        return this;
    }
 
    tooltip.text = function(value) {
        text = value;
        return this;
    }
 
    tooltip.style = function(name, value) {
        styles.push(arguments);
        return this;
    }
 
    return tooltip;
};