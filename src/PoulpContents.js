import {TYPES, fake} from "./utils/nodeTypes"
import {getContents, getSequence, getSequenceEnds, getContentEnds, getEndFinalDestination, getContent} from "./utils/jsonNav"
import {
  addContent,
  connectContents, gotoContent,
  removeContent,
  removeContentLink,
  removeContentOutput
} from "./utils/contents";
import {endDestination, troncateStationTitle} from "./utils/misc";
import {addSequence, addSequenceEnd} from "./utils/sequences"
import {event, select} from "d3-selection"


export default function Contents(chapitres, sequenceID) {

  this.sequenceID = sequenceID
  this.Data = chapitres
  this.json = getContents(chapitres, sequenceID)

  this.r = [0, 40, 45, 45, 55]
  this.decalangle = [0, .779, 1.05, 1.175, 1.255]

  this.stationMenu = stationMenu.bind(this)
  this.pointerMenu = pointerMenu.bind(this)
  this.onLink = onLink.bind(this)
  this.mapMenu = mapMenu.bind(this)
  this.exitName = exitName.bind(this)


  this.loadMap({
    insertChildren,
    childrenDetect,
    getLinkedNode,
    station,
    pointer,
    link
  })
}

/***
 * Fonction recursive permettant de transformer les données du json brut
 * en données exploitables par d3 Tree
 *
 * @param contents
 * @param content
 * @returns {{node: *, children}}
 */
function insertChildren(contents, content) {

  return {
    node: content,
    children: getContentEnds(content).map(output => {

      if (!output.destination)
        return insertChildren(contents, fake())

      const cont = contents.find(c => c.id === output.destination)

      if (!cont) {
        delete output.destination
        return insertChildren(contents, fake())
      }

      return insertChildren(contents, cont)

    })
  }
}

function childrenDetect(station) {
  return getContentEnds(station.data.node)
}

function getLinkedNode(nodes, destinationID) {
  return nodes.find(n => n.data.node.id === destinationID)
}

function station() {

  const Map = this
  const {r} = this
  const {sequenceHeight} = Map.options

  return {

    enter: function (stationEnter) {

      stationEnter.filter(d => d.data.node._type === TYPES.CONTENT).call(contentSVG.bind(Map))

    },

    merge: function (stationMerge) {

      const rayon = (d) => Math.abs(r[d.pointers.length - 1] - 5)

      stationMerge.select(".backCircle").transition().attr("r", d => rayon(d))

      stationMerge.select(".bp")
        .transition()
        .attr("d", d => `M -100 ${-sequenceHeight * .5}
            C -30 ${-sequenceHeight * .5} -30 ${-rayon(d)} 0 ${-rayon(d)}
            L 0 ${rayon(d)}
            C -30 ${rayon(d)} -30 ${rayon(d) * .5} -100 ${sequenceHeight * .5}`)

    }

  }

}

function link() {

  const {contentLinkSize, contentLinkColor} = this.options

  return {

    enter: function (voieEnter) {

    },

    merge: function (voieMerge) {

      voieMerge.select(".line")
        .attr("stroke-width", contentLinkSize)
        .attr("stroke", contentLinkColor)
    }

  }

}

function pointer() {

  return {

    enter: function (pointerEnter) {

      const choice = pointerEnter
        .append("g")
        .attr("class", "choice")
        .attr("transform", `translate(20,0)`)
        .attr("opacity", 0)

      choice
        .append("rect")
        .attr("width", 130)
        .attr("height", 30)
        .attr("rx", 5)
        .attr("y", -15)
        .attr("fill", "#676767")

      choice
        .append("text")
        .attr("class", "choiceText")
        .attr("fill", "white")
        .attr("dominant-baseline", "central")
        .attr("x", 10)

    },

    merge: function (pointerMerge) {

      pointerMerge
        .select("circle")
        .attr("stroke", "black")

      pointerMerge.select(".choiceText").text(d=>troncateStationTitle(d.end.choice))

      pointerMerge
        .on("mouseover", function () {
          const pointerNode = select(this)
          pointerNode.select(".choice").attr("opacity", d=>d.end.choice ? 1 : 0)
        })
        .on("mouseout", function () {
          const pointerNode = select(this)
          pointerNode.select(".choice").attr("opacity", 0)
        })

    }

  }

}

function contentSVG(c) {

  const {sequenceHeight, sequenceWidth, sequenceColor, linkColor, linkSize} = this.options
  const h = sequenceHeight, w = sequenceWidth;

  const content = c.append("g").attr("class", TYPES.CONTENT)

  // Un petit cercle de style qui permet de lier de façon naturelle
  // aux links
  content.append("circle")
    .attr("r", linkSize * .5)
    .attr("fill", linkColor)

  // Le fond de couleur qui relie tous les pointers
  content.append("path")
    .attr("class", "bp")
    .attr("fill", sequenceColor)

  content.append("circle")
    .attr("class", "backCircle")
    .attr("fill", sequenceColor)

  const contentFront = content
    .append("g")
    .attr("transform", `translate(${-w * .9},0)`)

  contentFront
    .append("rect")
    .attr("class", "background")
    .attr("y", -(h * .5))
    .attr("rx", h * .5)
    .attr("ry", h * .5)
    .attr("width", w)
    .attr("height", h)
    .attr("fill", sequenceColor)

  contentFront
    .append("text")
    .classed("name", true)
    .attr("width", w)
    .attr("x", 15)
    .attr("text-anchor", "left")
    .attr("dominant-baseline", "middle")
    .attr("fill", "white")
    .style("opacity", 1)
}

function stationMenu(station) {

  const chapitres = this.Data
  const {onClickNode} = this.options
  const type = station.data.node._type

  const itemArchiver = {
    title: 'Archiver',
    action: (d) => !d.data.node.start && removeContent(chapitres, d)
  }

  if (type === TYPES.EXIT) {
    return [itemArchiver]
  }

  let menu = [
    {
      title: 'Edit',
      action: (d) => {
        onClickNode(d.data.node, {x: event.pageX, y: event.pageY})
      }
    },
  ]

  if (!station.data.node.start)
    menu.push(itemArchiver)

  return menu
}

function pointerMenu(pointer) {

  const chapitres = this.Data
  const currentSequence = getSequence(chapitres, this.sequenceID)

  const createSequence = (endFrom, endTo) => {
    addSequence(chapitres, endTo, null, (s) => {
      //endTo.destination = s.contents[0].id
      addContent(chapitres, endFrom, endTo)
    })
  }

  if (endDestination(pointer.end)) {
    return [
      {
        title: 'Déconnecter',
        action: (pointer) => removeContentLink(chapitres, pointer)
      },
    ]
  }

  let menu = [
    {
      title: 'Ajouter un contenu',
      action: ({end}) => {
        addContent(chapitres, end)
      }
    },
    {
      title: "Vers une nouvelle séquence",
      action: ({end}) => {

        const freeEnd = getSequenceEnds(currentSequence).find(e => !e.destination)

        if (freeEnd)
          return createSequence(end, freeEnd)

        addSequenceEnd(chapitres, currentSequence, (newEnd) => {
          createSequence(end, newEnd)
        })
      }
    }
  ]

  const contentEnds = pointer.station.data.node.outputs

  if (contentEnds.length > 1)
    menu.push(
      {
        title: "supprimer l'output",
        action: (pointer) => removeContentOutput(chapitres, pointer)
      }
    )

  this.ends.filter(e => endDestination(e)).forEach(endTo => {

    const name = getEndFinalDestination(chapitres, endTo).name

    menu.push({
      title: `OUTPUT - ${name}`,
      action: ({end}) => {
        addContent(chapitres, end, endTo)
      }
    })
  })

  return menu

}

function onLink(pointer, station) {

  const content = station.data.node

  if(!content.position)
    return gotoContent(this.Data, pointer, content)

  connectContents(this.Data, pointer, content)
}

function exitName(exit) {

  const dest = getEndFinalDestination(this.Data, getContent(this.Data,exit.end))

  if (!dest) return "!!!"

  return dest.name
}

function mapMenu() {

}
