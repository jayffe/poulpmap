import {
  getChapitre, getChapitreEnds, getEndFinalDestination, getSequenceEnds,
  getSequences
} from "./utils/jsonNav"
import {TYPES, fake} from "./utils/nodeTypes"
import {endDestination, splitID, troncateStationTitle, isStart} from "./utils/misc"
import {
  addSequence,
  removeSequenceLink,
  removeSequenceEnd,
  addCondition,
  addSequenceEnd,
  removeSequence,
  connectSequences,
  gotoSequence
} from "./utils/sequences"
import {addChapitre, addChapitreEnd} from "./utils/chapitres";
import {select} from "d3-selection";


export default function Sequences(chapitres, chapitreID) {

  this.options.gridSize = [120, 360]

  this.Data = chapitres
  this.json = getSequences(chapitres, chapitreID)
  this.chapitreID = chapitreID

  this.r = [0, 40, 45, 45, 55]
  this.decalangle = [0, .779, 1.05, 1.175, 1.255]

  this.pointerMenu = pointerMenu.bind(this)
  this.stationMenu = stationMenu.bind(this)
  this.mapMenu = mapMenu.bind(this)
  this.onLink = onLink.bind(this)
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
 * @param sequences
 * @param sequence
 * @returns {{node: *, children}}
 */
function insertChildren(sequences, sequence) {

  return {
    node: sequence,
    children: getSequenceEnds(sequence).map(end => {

      if (!end.destination)
        return insertChildren(sequences, fake())

      const seq = sequences.find(s => s.id === splitID(end.destination).sequenceID)

      if (!seq) {
        delete end.destination
        return insertChildren(sequences, fake())
      }

      return insertChildren(sequences, seq)
    })
  }
}

function childrenDetect(station) {

  return getSequenceEnds(station.data.node)
}

function getLinkedNode(nodes, destinationID) {

  return nodes.find(n => splitID(n.data.node.id).sequenceID === splitID(destinationID).sequenceID)
}

/***
 * Chaque node est appelé une station sans distinction entre condition ou sequence
 * Le filtrage est fait dans la fonction ce qui permet ici de programmer des comportement
 * partagés par les deux types
 */
function station() {

  const Map = this
  const {r} = this
  const {conditionRadius, sequenceHeight, sequenceWidth} = this.options

  return {

    enter: function (stationEnter) {

      stationEnter.filter(d => d.data.node._type === TYPES.SEQUENCE).call(sequenceSVG.bind(Map))

      stationEnter.filter(d => d.data.node._type === TYPES.CONDITION).call(conditionSVG.bind(Map))
    },

    merge: function (stationMerge) {

      const rayon = (d) => Math.abs(r[d.pointers.length - 1] - 5)

      stationMerge.select(".backCircle").attr("r", d => rayon(d))
      stationMerge.select(".circleBehind")
        .transition()
        .attr("r", (d) => d.pointers.length > 1 ? conditionRadius : 0)

      stationMerge.select(".bp")
        .transition()
        .attr("d", d => `M -100 ${-sequenceHeight * .5}
            C -30 ${-sequenceHeight * .5} -30 ${-rayon(d)} 0 ${-rayon(d)}
            L 0 ${rayon(d)}
            C -30 ${rayon(d)} -30 ${rayon(d) * .5} -100 ${sequenceHeight * .5}`)

      stationMerge
        .select(".name")
        .text(d => troncateStationTitle(d.data.node.start ? "Start" : d.data.node.name, sequenceWidth))

    }

  }

}

function pointer() {

  const Map = this
  const {conditionColor, sequenceColor, exitColor} = Map.options

  return {

    enter: function (pointerEnter) {

      pointerEnter
        .select("circle.outside")
        .attr("stroke-width", d => isSequencePointer(d) ? 2 : 4)

      pointerEnter
        .select("circle.inside")
        .attr("fill", d => isSequencePointer(d) ? "white" : conditionColor)

      const choice = pointerEnter
        .append("g")
        .attr("class", "cond")
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
        .attr("class", "condText")
        .attr("fill", "white")
        .attr("dominant-baseline", "middle")
        .attr("x", 10)
    },

    merge: function (pointerMerge) {

      const color = (d)=> d.station.data.node.start ? exitColor : sequenceColor

      pointerMerge
        .select("circle")
        .attr("stroke", d => isSequencePointer(d) ? color(d) : conditionColor)

      pointerMerge
        .select("text")
        .attr("fill", d => isSequencePointer(d) ? "black" : "white")

      pointerMerge.select(".condText").text(({end})=>end.condVal && `${end.condKey} ${end.condOp} ${end.condVal}`)

      pointerMerge
        .on("mouseover", function () {
          const pointerNode = select(this)
          pointerNode.select(".cond").attr("opacity", d=>d.end.condVal ? 1 : 0)
        })
        .on("mouseout", function () {
          const pointerNode = select(this)
          pointerNode.select(".cond").attr("opacity", 0)
        })

    }

  }

}

function link() {

  const Map = this
  const {line} = Map
  const {sequenceLinkSize, sequenceLinkColor, sequenceBacklineColor, sequenceBacklineSize} = Map.options

  return {

    enter: function (voieEnter) {

      voieEnter
        .append('path')
        .attr("class", "path backline")
        .attr("fill", "none")
        .attr("stroke-width", sequenceBacklineSize)
        .attr("stroke", sequenceBacklineColor)

    },

    merge: function (voieMerge) {

      voieMerge
        .select(".line")
        .attr("stroke-width", d=>d.type==="goto"?sequenceLinkSize*1.5:sequenceLinkSize)
        .attr("stroke",d=>d.type==="goto"?"#91C5D8":sequenceLinkColor)

      voieMerge
        .select(".backline")
        .transition()
        .attr("d", line)
        .attr("opacity",d=>d.type==="goto"?0:1)

    }

  }
}

function sequenceSVG(s) {

  const {sequenceHeight, sequenceWidth, sequenceColor, exitColor, linkColor, sequenceBacklineSize} = this.options
  const h = sequenceHeight, w = sequenceWidth


  const sequence = s.append("g").attr("class", TYPES.SEQUENCE)

  // Un petit cercle de style qui permet de lier de façon naturelle
  // aux links
  sequence.append("circle")
    .attr("r", sequenceBacklineSize * .5)
    .attr("fill", linkColor)

  // On ajoute le cercle qui sera ajouté visuellement
  // si la sequence possède plusieurs sorties
  sequence.append("circle")
    .attr("class", "circleBehind")
    .attr("cx", 10)
    .attr("fill", "white")
    .attr("stroke-width", 10)
    .attr("stroke", linkColor)

  // Le fond de couleur qui relie tous les pointers
  sequence.append("path")
    .attr("class", "bp")
    .attr("fill", sequenceColor)

  sequence.append("circle")
    .attr("class", "backCircle")
    .attr("fill", sequenceColor)



  const sequenceFront = sequence
    .append("g")
    .attr("transform", d=>`translate(${isStart(d)?-140:-w * .9},0)`)

  sequenceFront
    .append("rect")
    .attr("class", "background")
    .attr("y", -(h * .5))
    .attr("rx", h * .5)
    .attr("ry", h * .5)
    .attr("width", d=>isStart(d) ? 160 : sequenceWidth)
    .attr("height", h)
    .attr("fill", d=>isStart(d) ? exitColor : sequenceColor)

  sequenceFront
    .append("text")
    .classed("name", true)
    .attr("width", w)
    .attr("x", d=>isStart(d) ? 50 : 15)
    .attr("text-anchor", "left")
    .attr("dominant-baseline", "middle")
    .attr("fill", "white")
    .style("opacity", 1)

  sequenceFront.filter(d=>isStart(d)).append("g").attr("transform", `translate(30,0)`).call(this.exitLogoSvg)

}

function conditionSVG(c) {

  const {conditionColor, conditionRadius, linkColor} = this.options

  const condition = c.append("g").attr("class", TYPES.CONDITION)

  condition.append("circle")
    .attr("r", conditionRadius)
    .attr("stroke-width", 8)
    .attr("fill", "white")
    .attr("stroke", linkColor)

  condition.append("circle")
    .attr("class", "conditionCircle")
    .attr("r", conditionRadius * .5)
    .attr("fill", conditionColor)

}

function isSequencePointer(d) {
  return d.station.data.node._type === TYPES.SEQUENCE
}

function pointerMenu(pointer) {

  const chapitres = this.Data

  const createChapitre = (endFrom, endTo) => {
    addChapitre(chapitres, endTo, (newChapitre) => {
      addSequence(chapitres, endFrom, endTo)
    })
  }

  if (endDestination(pointer.end)) {
    return [
      {
        title: 'Déconnecter',
        action: (pointer) => removeSequenceLink(chapitres, pointer, this.pointers)
      },
    ]
  }

  let menu = [
    {
      title: 'Ajouter une séquence',
      action: ({end}) => addSequence(chapitres, end)
    },
    {
      title: 'Ajouter une condition',
      action: (pointer) => addCondition(chapitres, pointer)
    },
    {
      title: "Vers un nouveau chapitre",
      action: ({end}) => {

        const currentChapitre = getChapitre(chapitres, this.chapitreID)

        const freeEnd = getChapitreEnds(currentChapitre).find(e => !e.destination)

        if (freeEnd)
          return createChapitre(end, freeEnd)

        addChapitreEnd(chapitres, currentChapitre, (newEnd) => {
          createChapitre(end, newEnd)
        })

      }
    }
  ]


  const sequenceEnds = getSequenceEnds(pointer.station.data.node)

  if(sequenceEnds.length > 1)
    menu.push(
      {
        title: "supprimer l'output",
        action: (pointer) => removeSequenceEnd(chapitres, pointer)
      }
    )

  this.ends.filter(e => endDestination(e)).forEach(endTo => {

    const chapitre = getChapitre(chapitres, endDestination(endTo))

    menu.push({
      title: `OUTPUT - ${chapitre.name}`,
      action: ({end}) => addSequence(chapitres, end, endTo)
    })
  })

  return menu
}

function stationMenu(station) {

  const chapitres = this.Data
  const {setSequence} = this.options
  const {_type, start} = station.data.node

  const itemArchiver = {
    title: 'Archiver',
    action: (d) => !d.data.node.start && removeSequence(chapitres, d)
  }

  if(start)
    return false


  if (_type === TYPES.EXIT || _type === TYPES.CONDITION) {
    return [itemArchiver]
  }

  return [
    {
      title: 'Go inside',
      action: (d) => setSequence(d.data.node.id)
    },
    {
      title: 'Ajouter un output',
      action: (d) => addSequenceEnd(chapitres, d.data.node)
    },
    itemArchiver
  ]
}

function onLink(pointer, station) {

  const sequence = station.data.node

  if(!sequence.position)
    return gotoSequence(this.Data, pointer, sequence)

  connectSequences(this.Data, pointer, sequence)
}

function exitName(exit) {

  const dest = getEndFinalDestination(this.Data, getChapitreEnds(getChapitre(this.Data, exit.id)).find(e=>e.id===exit.end))

  if (!dest) return "!!!"

  return dest.name
}

function mapMenu(event) {

  const chapitres = this.Data

  return [
    {
      title: 'Ajouter une séquence',
      action: () => {
        const {x, y} = event
        addSequence(chapitres, {x, y, id: this.chapitreID})
      }
    }
  ]
}

