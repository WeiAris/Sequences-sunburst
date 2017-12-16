//画布宽高，和弧半径
var width = 750;
var height = 600;
var radius = Math.min(width, height) / 2;

//序列路径展示条的宽高，边距
var b = {
  w: 90, h: 30, s: 3, t: 10
};

// 为每一个页面设定颜色
var colors = {
  "home": "#5687d1",
  "analytics": "#7b615c",
  "page_1": "#de783b",
  "page_3": "#6ab975",
  "page_2": "#a173d1",
  "page_4": "#FFAEB9",
  "hobboy": "#FF34B3",
  "optimization": "#EEC591",
  "animate": "#D1EEEE",
  "Pause": "#CD4F39"
};

//页面的层级个数
var totalSize = 0; 
//设定图表画布
var vis = d3.select("#chart").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("id", "container")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
//设定分区布局
var partition = d3.layout.partition()
    .size([2 * Math.PI, radius * radius])
    .value(function(d) { return d.size; });
//设定弧生成器
var arc = d3.svg.arc()
    .startAngle(function(d) { return d.x; })
    .endAngle(function(d) { return d.x + d.dx; })
    .innerRadius(function(d) { return Math.sqrt(d.y); })
    .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });

d3.json("visit-sequences.json", function(json) {
    createVisualization(json);
});

function createVisualization(json) {

  initializeBreadcrumbTrail();
  drawLegend();
  d3.select("#togglelegend").on("click", toggleLegend);


  vis.append("circle")
      .attr("r", radius)
      .style("opacity", 0);

  // 为了提高效率，筛选节点只保留足够大的空间以查看
  var nodes = partition.nodes(json)
      .filter(function(d) {
           return (d.dx > 0.005); // 0.005指弧度
      });

  var path = vis.data([json]).selectAll("path")
      .data(nodes)
      .enter()
      .append("path")
      .attr("display", function(d) { return d.depth ? null : "none"; })
      .attr("d", arc)
      .style("fill", function(d) { return colors[d.name]; })
      .style("opacity", 1)
      .on("mouseover", mouseover);

  // 将mouseleave处理程序添加到边界圆.
  d3.select("#container").on("mouseleave", mouseleave);
  // 从分区获取树的总大小.
  totalSize = path.node().__data__.value;
 };

// 淡入淡出当前序列
function mouseover(d) {

  var percentage = (100 * d.value / totalSize).toPrecision(3);
  var percentageString = percentage + "%";
  if (percentage < 0.1) {
    percentageString = "< 0.1%";
  }

  d3.select("#percentage")
      .text(percentageString);

  d3.select("#explanation")
      .style("visibility", "");
//当你鼠标放到任何一个节点上时，都需要将它的父节点全部找出来
  var sequenceArray = getAncestors(d);
  //找出所有的父节点之后，调用updateBreadcrumbs函数更新整个序列路径
  updateBreadcrumbs(sequenceArray, percentageString);

  // 淡化所有节点.
  d3.selectAll("path")
      .style("opacity", 0.3);

  // 然后仅突出显示当前节点的祖先
  vis.selectAll("path")
      .filter(function(node) {
                return (sequenceArray.indexOf(node) >= 0);
              })
      .style("opacity", 1);
}

// 鼠标移出时，将所有内容恢复为完全不透明状态.
function mouseleave(d) {

  // 将上面序列顺序隐藏
  d3.select("#trail")
      .style("visibility", "hidden");

  // 在过渡过程中关闭所有字节
  d3.selectAll("path").on("mouseover", null);
//将每个片段转换为完全不透明，然后重新激活它。
  d3.selectAll("path")
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .each("end", function() {
              d3.select(this).on("mouseover", mouseover);
            });

  d3.select("#explanation")
      .style("visibility", "hidden");
}


function getAncestors(node) {
  var path = [];
  var current = node;
  while (current.parent) {
    path.unshift(current);
    current = current.parent;
  }//一层一层地找到所有父节点放入path数组中
  return path;
}
//初始化上面的序列变化路径
function initializeBreadcrumbTrail() {
 
  var trail = d3.select("#sequence").append("svg")
      .attr("width", width)
      .attr("height", 50)
      .attr("id", "trail");
  // 在最后添加标签，为百分比.
  trail.append("text")
    .attr("id", "endlabel")
    .style("fill", "#000");
}

// 生成一个描述序列路径的形状元素。
function breadcrumbPoints(d, i) {
  var points = [];
  points.push("0,0");
  points.push(b.w + ",0");
  points.push(b.w + b.t + "," + (b.h / 2));
  points.push(b.w + "," + b.h);
  points.push("0," + b.h);
  if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
    points.push(b.t + "," + (b.h / 2));
  }
  return points.join(" ");
}

// 更新序列路径以显示当前的顺序和百分比.
function updateBreadcrumbs(nodeArray, percentageString) {

  //数据加入; 键功能结合名称和深度（=序列中的位置）。
  var g = d3.select("#trail")
      .selectAll("g")
      .data(nodeArray, function(d) { return d.name + d.depth; });

  // 添加序列和标签以输入节点.
  var entering = g.enter().append("g");
//生成序列路径的背景形状
  entering.append("polygon")
      .attr("points", breadcrumbPoints)
      .style("fill", function(d) { return colors[d.name]; });

  entering.append("text")
      .attr("x", (b.w + b.t) / 2)
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function(d) { return d.name; });

  // 设置进入和更新节点的位置
  g.attr("transform", function(d, i) {
    return "translate(" + i * (b.w + b.s) + ", 0)";
  });

  // 删除现有的节点
  g.exit().remove();

  // 现在移动并更新最后的百分比。
  d3.select("#trail")
     .select("#endlabel")//序列后面的标签文字
      .attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(percentageString);
      
  d3.select("#trail")
      .style("visibility", "");

}
//画出图例的函数
function drawLegend() {

  // 图例项目的尺寸：宽度，高度，间距，圆角半径。
  var li = {
    w: 90, h: 30, s: 4, r:9
  };
//整个legend的宽高
  var legend = d3.select("#legend").append("svg")
      .attr("width", li.w)
      .attr("height", d3.keys(colors).length * (li.h + li.s));

  var g = legend.selectAll("g")
      .data(d3.entries(colors))//列出一个关联数组的键值对实体
      .enter()
      .append("g")
      .attr("transform", function(d, i) {
              return "translate(0," + i * (li.h + li.s) + ")";
           });

  g.append("rect")
      .attr("rx", li.r)//圆角矩形的圆角度
      .attr("ry", li.r)
      .attr("width", li.w)
      .attr("height", li.h)
      .style("fill", function(d) { return d.value; });

  g.append("text")
      .attr("x", li.w / 2)
      .attr("y", li.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function(d) { return d.key; });
}
//单击图例按钮，调动此函数
function toggleLegend() {
  var legend = d3.select("#legend");
  if (legend.style("visibility") == "hidden") {
    legend.style("visibility", "");
  } else {
    legend.style("visibility", "hidden");
  }
}
