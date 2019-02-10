import {zoom} from "d3-zoom"
import {event, selectAll, select, mouse} from "d3-selection"
import {drag} from "d3-drag"
import {line, curveBasis, symbol, symbolTriangle} from "d3-shape"
import {placePointer, troncateStationTitle, endDestination, randomID} from "./utils/misc"
import {TYPES} from "./utils/nodeTypes"
import Chapitres from "./PoulpChapitres"
import Sequences from "./PoulpSequences"
import Contents from "./PoulpContents"
import "./PoulpMap.css"
import {hierarchy, tree} from "d3-hierarchy"

const curve = line().curve(curveBasis)


export default class PoulpMap {

  defaultOptions = {

    gridSize: [180, 360],

    chapitreRadius: 100,
    chapitreLinkSize: 37,
    chapitreLinkColor: "#192440",
    chapitreStroke: 25,

    sequenceColor: "#4DCF7D",
    sequenceLinkSize: 5,
    sequenceLinkColor: "#fff",
    sequenceBacklineColor: "#306D88",
    sequenceBacklineSize: 46,
    sequenceHeight: 40,
    sequenceWidth: 200,

    conditionColor: "#36ACC8",
    conditionRadius: 80,

    contentLinkSize: 5,
    contentLinkColor: "#192440",
    exitColor: "#e2305c",

    pointerRadius: 16,

    linkColor: "#1F5B76",
    gotoColor: "#fe8549",

    onChange: (chapitres) => {
    },
    onClickNode: (node) => {
    },
    onDragEnd: (node) => {
    }
  }

  constructor(svg, options) {

    this.options = {...this.defaultOptions, ...options}

    this.startPos = {
      x: options.width * .3 || 200,
      y: options.height * .5 || 200
    }

    svg = select(svg)

    svg
      .attr("class", "poulpMap")
      .attr("width", options.width)
      .attr("height", options.height)
      .call(this.mapZoom)

    svg
      .append("rect")
      .attr("class", "background")
      .attr("width", options.width)
      .attr("height", options.height)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mousedown", () => this.contextMenu('close'))
      .on("contextmenu", () => {
        return this.contextMenu(this.mapMenu({e: event, x: event.x, y: event.y}))()
      })

    this.svg = svg

    this.g = this.svg.append("g").attr("class", "global")
      .attr("transform", `translate(${this.startPos.x},${this.startPos.y})`)
    this.gTrees = this.g.append("g")
      .attr("class", "trees")
  }

  setOptions = (_opts) => {

    this.options = {...this.options, ..._opts}

    return this
  }

  mapZoom = m => {
    m.call(zoom()
      .scaleExtent([.1, 100])
      .on("zoom", () => {
        this.gTrees.attr("transform", event.transform)
      }))
  }

  line = ({from, to}) => {

    return from.end && from.end.goto

      ? curve([
        [from.x, from.y],
        [from.x + (this.options.conditionRadius * 1.2), from.y],
        [to.x - (this.options.sequenceWidth), to.y],
        [to.x, to.y]
      ])

      : curve([
        [from.x, from.y],
        [from.x + (this.options.conditionRadius), to.y],
        [to.x - (this.options.sequenceWidth), to.y],
        [to.x, to.y]
      ])

  }

  contextMenu = (menu) => {

    if (!menu) return function () {
    }
    const {Data, options} = this
    const {onChange} = options

    select('body').selectAll('.d3-context-menu').data([1])
      .enter()
      .append('div')
      .attr('class', 'd3-context-menu');

    // Fermeture du menu
    select('body').on('click.d3-context-menu', function () {
      select('.d3-context-menu').style('display', 'none')
    })

    // this gets executed when a contextmenu event occurs
    return function (node) {

      selectAll('.d3-context-menu').html('');
      let list = selectAll('.d3-context-menu').append('ul');
      list.selectAll('li').data(menu).enter()
        .append('li')
        .html(function (d) {
          return d.title;
        })
        .on('click', function (d, i) {
          d.action(node);
          select('.d3-context-menu').style('display', 'none');
          onChange(Data)
        });


      // display context menu
      select('.d3-context-menu')
        .style('left', (event.pageX - 2) + 'px')
        .style('top', (event.pageY - 2) + 'px')
        .style('display', 'block');

      event.preventDefault()
    };
  }

  drag = (s, onEnd) => {

    s.call(drag()
      .on("start", () => event.sourceEvent.stopPropagation())
      .on("drag", d => {
        if (!d.data.node.position) return

        const m = mouse(this.gTrees.node()),
          mouseX = m[0],
          mouseY = m[1]

        select(d.tree.node()).attr("transform", `translate(${mouseX},${mouseY})`)
        d.data.node.position = {x: mouseX, y: mouseY}
      })
      .on("end", d => {
        if (!d.data.node.position) return

        onEnd(d)
      }))
  }

  cautionSign = (el) => {

    const {sequenceWidth, sequenceHeight, conditionRadius} = this.options

    const r = sequenceHeight * .5

    //TODO : virer les notions de sequence dans cette partie de code
    const g = el.append("g")
      .attr("class", "caution")
      .attr("transform", d => `translate(${-(d.data.node._type === TYPES.SEQUENCE || d.data.node._type === TYPES.CONTENT ? sequenceWidth + 5 : conditionRadius + 25) },0)`)
      .attr("opacity", 0)

    g.append("circle")
      .attr("r", r)
      .attr("fill", "#eb4e40")

    g.append("text")
      .text("!")
      .attr("width", r)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", r)
      .attr('fill', "white")

  }

  loadMap = ({insertChildren, childrenDetect, station, pointer, link, getLinkedNode}) => {

    const Map = this
    const {json} = Map

    this.totalNodes = 0

    Map.createTrees({json, insertChildren})

    this.gTrees.selectAll(".tree").each(function (treeJson) {

      const treeNode = select(this)
      const {nodes, links} = Map.prepareNodes(treeNode, treeJson, childrenDetect, getLinkedNode)

      Map.renderNodes(treeNode, nodes, links, station, pointer, link)
    })
  }

  /***
   * Determine les arbres à afficher et fabrique les json compatibles
   * avec la logique de création d'arbres.
   *
   * Créé également pour chaque arbre un groupe svg pour assurer un superposition
   * lisible des elements à afficher ( nodes au dessus de links... )
   *
   * @param opts
   */
  createTrees = ({json, insertChildren}) => {

    this.ends = []
    this.pointers = []

    /***
     * Récupération des differents arbres déduits par l'absence de lien entrant
     * sur le content start de chaque sequence
     */
    const trees = []
    json.forEach(node => {

      // si le node possede un start ou une position, il devient le root d'un arbre
      if (node.start || node.position)
        trees.push(insertChildren(json, node))

      // on récupère tous les ends de la vue
      if (node._type === TYPES.END) this.ends.push({...node})
    })

    const treeNodes = this.gTrees.selectAll(".tree").data(trees, (d, i) => `tree-${i}`)

    treeNodes.exit().remove()

    /***
     * A la création de chaque arbre, on ajoute deux groupes links et nodes
     * de façon à ce que les nodes se retrouve au dessus dans l'affichage
     */
    const tEnter = treeNodes.enter().append("g").attr("class", (d, i) => `tree tree-${i}`)
    tEnter.append("g").classed("gLinks", true)
    tEnter.append("g").classed("gNodes", true)

    /***
     * Repositionne les arbres en fonction de la position sauvegardée
     * des root ( orphelins )
     */
    treeNodes.merge(this.gTrees.selectAll(".tree"))
      .attr("transform", ({node}) => node.position && `translate(${node.position.x},${node.position.y})`)

  }

  /***
   * Reformatte le contenu de chaque node pour s'adapter à l'affichage horizontal
   * de l'arbre et place les pointers de connections en xy
   *
   * Appelle également le render des nodes et pointers d3 directement
   *
   * @param treeNode
   * @param treeJson
   * @param childrenDetect
   * @param getLinkedNode
   */
  prepareNodes = (treeNode, treeJson, childrenDetect, getLinkedNode) => {

    const {gridSize} = this.options

    const t = tree().nodeSize(gridSize).separation((a, b) => 1)

    const treeData = t(hierarchy(treeJson))

    /***
     * On inverse x et y car un arbre classique se place du haut vers le bas
     */
    const nodes = treeData.descendants().map((d, i) => ({
      ...d,
      x: d.y,
      y: d.x,
      pointers: [],
      tree: treeNode, // on passe l'element tree pour pouvoir deplacer l'arbre complet lors du drag d'orphelin
    }))

    /***
     * Placement des pointers
     */
    const links = []
    nodes.forEach(station => {

      station.nid = `nid_${randomID()}`

      // TODO : voir si je ne peux pas detecter les children plus simplement
      const ends = childrenDetect(station)
      const endsCount = ends.length

      for (let i = 0; i < ends.length; i++) {

        // Calcul du positionnement de chaque pointer
        const
          end = ends[i],
          {localX, localY, x, y} = placePointer(station, endsCount, i, this.r)

        let pointer = {localX, localY, x, y, end, tree: treeNode, station}

        // Si le end du pointer possède une destination, on ajoute un lien à tirer
        if (endDestination(end)) {
          const to = getLinkedNode(nodes, endDestination(end))
          if (to)
            links.push({
              id: `${station.data.node.id}-${to.data.node.id}`,
              from: pointer,
              to,
              type: end.destination ? "link" : "goto"
            })
          pointer = {...pointer, to}
        }

        station.pointers.push(pointer)
        this.pointers.push(pointer)
      }

      return station
    })

    return {nodes, links}
  }

  /***
   * Placement des stations et des voies sur la map
   *
   * @param treeNode
   * @param nodes
   * @param links
   * @param station
   * @param pointer
   * @param link
   */
  renderNodes = (treeNode, nodes, links, station, pointer, link) => {

    this.renderStations(treeNode, nodes, station, pointer)
    this.renderLinks(treeNode, links, link)
  }

  renderStations = (treeNode, nodes, station, pointer) => {

    const Map = this
    const {drag, contextMenu, cautionSign, stationMenu, exitSVG} = Map
    const {onClickNode, onDragEnd, sequenceWidth} = Map.options

    const gNodes = treeNode.select(".gNodes")

    const stations = gNodes.selectAll(".node").data(nodes, d => `${d.data.node._type}_${d.data.node.id}`)

    stations.exit().remove()

    /* StationsEnter
    -------------------------------------------------------------------------------------------------*/
    const stationEnter = stations.enter()
      .append("g")
      .attr("class", d => `node ${d.nid}`)
      .attr("nid", d => d.nid)
      .attr("transform", d => d.parent && `translate(${d.parent.y},${d.parent.x})`)

    stationEnter
      .on("click", d => onClickNode(d.data.node, {x: event.pageX, y: event.pageY}))
      .on("contextmenu", d => contextMenu(stationMenu(d))(d))
      .call((d) => drag(d, onDragEnd))

    stationEnter
      .filter(d => d.data.node._type !== TYPES.FAKE)
      .on("mouseover", (d) => {
        event.preventDefault()
        this.stationTo = d
      })

    stationEnter.call(cautionSign)
    stationEnter.call(station.call(Map).enter)
    stationEnter.append("g").attr("class", "pointers")


    /* StationsMerge
    -------------------------------------------------------------------------------------------------*/
    const stationMerge = stationEnter.merge(stations)

    stationMerge.filter(d => d.data.node._type === TYPES.EXIT).each(function (d) {
      exitSVG(select(this))
    })

    stationMerge.filter(s => s.data.node._type !== TYPES.EXIT).call(s => this.stationPointers(s, pointer))

    stationMerge
      .select(".name")
      .attr("font-size", "22px")
      .text(d => troncateStationTitle(d.data.node.name, sequenceWidth))

    stationMerge
      .transition()
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .select(".caution")
      .attr("opacity", d => d.data.node.position ? 1 : 0)


    stationMerge.call(station.call(Map).merge)

    stationMerge.select(".gotobadge").attr("opacity", 0)

  }

  renderLinks = (treeNode, links, link) => {

    const Map = this

    const gLinks = treeNode.select(".gLinks")


    /* Les Voies
    -------------------------------------------------------------------------------------------------*/
    const voies = gLinks.selectAll(".voie").data(links, d => d.id)

    voies.exit().remove()

    /* VoieEnter
    -------------------------------------------------------------------------------------------------*/
    const voieEnter = voies.enter()
      .append("g")
      .attr("class", `voie`)
      .attr("opacity", 0)

    voieEnter.call(link.call(Map).enter)

    voieEnter
      .append('path')
      .attr("class", `path line`)
      .attr("fill", "none")

    /* VoieMerge
    -------------------------------------------------------------------------------------------------*/
    const voiesMerge = voieEnter.merge(voies)

    voiesMerge.transition().attr("opacity", 1)

    voiesMerge.call(link.call(Map).merge)

    voiesMerge
      .select(".line")
      .transition()
      .style("stroke-dasharray", d => d.type === "goto" ? "16,6" : "0,0")
      .attr("d", Map.line)

  }

  /***
   * Placement des pointers sur chaque station
   *
   * @param stationMerge
   * @param pointerFunc
   */
  stationPointers = (stationMerge, pointerFunc) => {

    const Map = this
    const {contextMenu, line, pointerMenu} = Map
    const {pointerRadius, onChange, linkColor, gotoColor} = Map.options


    stationMerge.select(".pointers").each(function (d) {

      const data = d.pointers

      const pointer = select(this).selectAll(".pointer").data(data)

      pointer.exit().remove()

      const pointerEnter = pointer.enter()
        .append("g")
        .attr("class", "pointer")

      pointerEnter
        .append("circle")
        .attr("class", "outside")
        .attr("fill", "white")
        .attr("stroke", linkColor)
        .attr("stroke-width", 1)
        .attr("r", pointerRadius)

      pointerEnter
        .append("text")
        .text("+")
        .attr("fill", "#1d1d1d")
        .attr("width", pointerRadius)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "22px")

      const goto = pointerEnter
        .append("g")
        .attr("class", "goto")

      goto
        .append("circle")
        .attr("r", pointerRadius * .8)
        .attr("fill", gotoColor)

      pointerEnter.call(pointerFunc.call(Map).enter)

      const pointerMerge = pointer.merge(select(this).selectAll(".pointer"))

      pointerMerge.transition().attr("transform", d => `translate(${d.localX},${d.localY})`)
      pointerMerge.select("text").attr("opacity", d => endDestination(d.end) ? 0 : 1)

      pointerMerge.on("click", (d, i) => {
        event.stopPropagation()
        return contextMenu(pointerMenu(d))(d)
      })

      pointerMerge.call(pointerFunc.call(Map).merge)

      pointerMerge.select(".goto").attr("opacity", d => d.end.goto ? 1 : 0)

      const pointerDragEnd = (d) => {

        // Si aucune station n'a été survolée, on sort
        if (!Map.stationTo) return

        // Si il s'agit de la même station, niet...
        if (Map.stationTo.data.node.id === d.station.data.node.id) return

        // Si il s'agit de la premiere station
        if (Map.stationTo.data.node.start) return

        Map.onLink(d, Map.stationTo)
        onChange(Map.Data)
        Map.stationTo = null
      }

      const pointerDragStart = (d) => {

        Map.stationTo = null

        const gLinks = d.tree.select(".gLinks")

        gLinks.append("path")
          .attr("class", "linker")
          .attr("fill", "none")
          .attr("stroke-width", 5)
          .attr("stroke", "black")
      }

      pointerMerge
        .call(drag()
          .on("start", function (d) {
            Map.stationTo = null
            if (endDestination(d.end)) return

            event.sourceEvent.stopPropagation()

            select(this).select("text").attr("opacity", 0)
            pointerDragStart(d)
          })
          .on("drag", d => {
            if (endDestination(d.end)) return
            const m = mouse(d.tree.node())
            selectAll('.linker').attr("d", line({
              from: {x: d.x, y: d.y},
              to: {x: m[0], y: m[1]}
            }))
          })
          .on("end", function (d) {
            if (endDestination(d.end)) return

            select(this).select("text").attr("opacity", d => endDestination(d.end) ? 0 : 1)
            selectAll('.linker').remove()
            pointerDragEnd(d)
          }))


    })

  }

  /***
   * Design du svg exit partagé par les sequences et les contenus
   *
   * @param g
   */
  exitSVG = (g) => {

    const {exitName} = this
    const {linkColor, sequenceHeight, sequenceBacklineSize, exitColor, onChange, sequenceWidth} = this.options

    // TODO adapter la linksize en fonction du type de map
    const linkSize = sequenceBacklineSize

    const exit = g.selectAll(`.${TYPES.EXIT}`).data(d => [d], d => d.data.node.id)

    exit.exit().remove()

    const exitEnter = exit.enter().append("g").attr("class", TYPES.EXIT)

    exitEnter
      .append("circle")
      .attr("r", linkSize * .5)
      .attr("fill", linkColor)

    exitEnter
      .append("rect")
      .attr("class", "gotorect")
      .attr("y", -(sequenceHeight * .5))
      .attr("rx", sequenceHeight * .5)
      .attr("ry", sequenceHeight * .5)
      .attr("width", sequenceWidth)
      .attr("x", -182)
      // .attr("width", 70)
      // .attr("x", -50)
      .attr("height", sequenceHeight)
      .attr("fill", exitColor)

    exitEnter
      .append('text')
      .attr("x", -134)
      .attr("text-anchor", "left")
      .attr("dominant-baseline", "middle")
      .attr("fill", "white")

    exitEnter
      .append("g")
      .attr("class", "ends")

    g.append("g").attr("transform", `translate(${-154},0)`).call(this.exitLogoSvg)

    const exitMerge = exitEnter.merge(exit)

    const ends = exitMerge.select(".ends")

    const endPins = ends.selectAll(".ending").data(this.ends, e => e.id)

    endPins.exit().remove()

    exitMerge.select("text").text(d => troncateStationTitle(exitName(d.data.node), sequenceWidth))

    const endPinsEnter = endPins.enter()
      .append("g")
      .attr("class", "ending")
      .on("mouseover", function () {
        select(this).style("cursor", "pointer")
      })
      .on("mouseout", function () {
        select(this).style("cursor", "default")
      })
      .on("click", end => {

        const {node} = g.datum().data
        node.end = end.id
        onChange(this.Data)
      })

    endPinsEnter
      .append("circle")
      .attr("class", "pin")

    const disconnectedPin = endPinsEnter
      .append("g")
      .attr("class", "disconnectedEnd")

    disconnectedPin
      .append("circle")
      .attr("r", 10)
      .attr("fill", "red")
      .attr("stroke", "white")
      .attr("stroke-width", 2)

    disconnectedPin
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "white")
      .text("!")

    const endPinsMerge = endPinsEnter.merge(endPins)

    endPinsMerge.each((end, i) => {

      const {node} = g.datum().data
      const {localX, localY} = placePointer(g.datum(), this.ends.length, i, this.r)
      end.localX = localX
      end.localY = localY
      end.iscurrentDest = node.end === end.id
    })

    endPinsMerge
      .select("circle")
      .transition()
      .attr("fill", d => d.iscurrentDest ? exitColor : "black")
      .attr("r", d => d.iscurrentDest ? 7 : 3)
      .attr("cx", d => d.localX)
      .attr("cy", d => d.localY)

    endPinsMerge
      .select(".disconnectedEnd")
      .transition()
      .attr("transform", d => `translate(${d.localX + 25},${d.localY})`)
      .attr("opacity", d => !endDestination(d) ? 1 : 0)

  }

  exitLogoSvg = (g) => {

    const triangleSize = 250
    const linesize = triangleSize * .05
    const triangle = symbol().type(symbolTriangle).size(triangleSize)

    g.append("path")
      .attr("d", triangle)
      .attr("stroke", "white")
      .attr("fill", "white")
      .attr("transform", `rotate(90)`)

    g.append("path")
      .attr("d", `M${-linesize * 1.2},${-linesize}L${-linesize * 1.2},${linesize}`)
      .attr("stroke", "white")
      .attr("fill", "white")
      .attr("stroke-width", 3)
  }

  /***
   * Map des chapitres
   * @type {any}
   */
  Chapitres = Chapitres.bind(this)

  /***
   * Map des Sequences
   * @param data
   * @constructor
   */
  Sequences = Sequences.bind(this)

  /***
   * Map des Contenus
   * @type {any}
   */
  Contents = Contents.bind(this)
}
