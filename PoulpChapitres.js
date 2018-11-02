import {TYPES, fake} from "./utils/nodeTypes"
import {endDestination, splitID} from "./utils/misc"
import {getChapitreEnds} from "./utils/jsonNav"
import {
  addChapitreEnd,
  removeChapitre,
  removeChapitreLink,
  addChapitre,
  addEndStory,
  removeChapitreOutput,
  connectChapitres, gotoChapitre
} from "./utils/chapitres"


export default function Chapitres(chapitres) {

  this.options.gridSize = [250, 350]


  this.Data = chapitres
  this.json = chapitres

  const {chapitreRadius} = this.options
  const decalage = chapitreRadius
  this.r = [decalage, decalage, decalage, decalage, decalage]

  this.stationMenu = stationMenu.bind(this)
  this.pointerMenu = pointerMenu.bind(this)
  this.mapMenu = mapMenu.bind(this)
  this.onLink = onLink.bind(this)

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
 * @param chapitres
 * @param chapitre
 * @returns {{node: *, children}}
 */
function insertChildren(chapitres, chapitre) {

  return {
    node: chapitre,
    children: getChapitreEnds(chapitre).map(end => {

      if (!end.destination)
        return insertChildren(chapitres, fake())

      const ch = chapitres.find(c => c.id === splitID(end.destination).chapitreID)

      if (!ch) {
        delete end.destination
        return insertChildren(chapitres, fake())
      }

      return insertChildren(chapitres, ch)
    })

  }
}

function getLinkedNode(nodes, destinationID) {

  return nodes.find(n => n.data.node.id === splitID(destinationID).chapitreID)
}

function childrenDetect(station) {
  return getChapitreEnds(station.data.node)
}

function station() {

  const Map = this

  return {

    enter: function (stationEnter) {

      stationEnter.filter(d => d.data.node._type === TYPES.CHAPITRE).call(chapitreSVG.bind(Map))

    },

    merge: function (stationMerge) {
    }

  }

}

function chapitreSVG(c) {

  const {chapitreRadius, chapitreLinkColor, exitColor, chapitreStroke, gotoColor} = this.options

  const chapitre = c.append("g")
    .attr("class", TYPES.CHAPITRE)

  chapitre
    .append("circle")
    .attr("r", chapitreRadius)
    .attr("fill", "white")
    .attr("stroke-width", chapitreStroke)
    .attr("stroke", d=>d.data.node.end ? exitColor : chapitreLinkColor)

  chapitre
    .append("text")
    .classed("name", true)
    .attr("width", chapitreRadius)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    //.attr("font-size", "18px")
    .attr("fill", "black")
    .style("opacity", 1)

  const gotobadge = chapitre
    .append("g")
    .attr("class","gotobadge")
    .attr("transform",`translate(${-chapitreRadius},0)`)

  gotobadge.append("circle").attr("r", 5).attr("fill", gotoColor)

}

function link() {

  const {chapitreLinkSize, chapitreLinkColor} = this.options

  return {

    enter: function (voieEnter) {

    },

    merge: function (voieMerge) {

      voieMerge.select(".line")
        .attr("stroke-width", chapitreLinkSize)
        .attr("stroke", chapitreLinkColor)
    }

  }

}

function pointer() {

  const Map = this
  const {chapitreLinkColor, chapitreStroke} = Map.options

  return {

    enter: function (pointerEnter) {

      pointerEnter
        .select(".outside")
        .attr("stroke", chapitreLinkColor)
        .attr("stroke-width", 1)
        .attr("r", chapitreStroke*.4)

    },

    merge: function (pointerMerge) {

      //pointerMerge.attr("transform", d => `translate(${d.localX + chapitreRadius},${d.localY})`)

    }

  }

}

function stationMenu(station) {

  const chapitres = this.Data
  const {setChapitre} = this.options

  let menu = [
    {
      title: 'Go inside',
      action: (d) => setChapitre(d.data.node.id)
    },
    {
      title: 'Ajouter un output',
      action: (d) => addChapitreEnd(chapitres, d.data.node)
    },
  ]

  if(station.data.node.end)
    menu = []


  if(!station.data.node.start)
    menu.push({
      title: 'Archiver',
      action: (d) => !d.data.node.start && removeChapitre(chapitres, d)
    })

  return menu

}

function pointerMenu(pointer) {

  const chapitres = this.Data

  if (endDestination(pointer.end)) {
    return [
      {
        title: 'Déconnecter',
        action: (pointer) => removeChapitreLink(chapitres, pointer)
      },
    ]
  }

  const menu = [
    {
      title: 'Ajouter un chapitre',
      action: (pointer) => {
        addChapitre(chapitres, pointer.end)
      }
    },
    {
      title: 'Ajouter une fin',
      action: (pointer) => {
        addEndStory(chapitres, pointer.end)
      }
    },
  ]

  const chapitreEnds = getChapitreEnds(pointer.station.data.node)

  if(chapitreEnds.length > 1)
  menu.push(
    {
      title: "supprimer l'output",
      action: (pointer) => removeChapitreOutput(chapitres, pointer)
    }
  )

  return menu
}

function mapMenu( event ){

  const chapitres = this.Data

  return [
    {
      title: 'Ajouter un chapitre',
      action: () => {
        const {x,y} = event
        addChapitre(chapitres, {x,y})
      }
    }
  ]
}

function onLink(pointer, station) {

  const chapitre = station.data.node

  if(!chapitre.position)
    return gotoChapitre(this.Data, pointer, chapitre)

  connectChapitres(this.Data, pointer, chapitre)
}