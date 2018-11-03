import Chance from "chance"
import {chapitreStart} from "./nodeTypes"


const chance = new Chance()

export const randomID = () => chance.hash({length: 15})

/**
 * Recuperation de largeur et hauteur de la fenetre
 * @type {number}
 */
export const screenWidth = window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth
export const screenHeight = window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight

export const splitID = (id) => {

  const
    contentID = id.split("||")[0],
    sequenceID = id.split(".")[0],
    chapitreID = id.split("__")[0]

  return {
    contentID,
    sequenceID,
    chapitreID
  }
}

export const upordown = (from, to) => {

  if (Math.abs(from.y - to.y) < 1) return 0

  return (from.y < to.y ? 1 : -1)
}

export const initialData = [chapitreStart()]

export const copyToClipboard = str => {
  const el = document.createElement('textarea');
  el.value = str;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

// TODO : être obligé de donner un tableau de rayon par type c'est pas très glop...
export const placePointer = (station, childCount, i, r) => {

  r = r || [0, 45, 45, 45, 55]
  const decalangle = [0, .779, 1.05, 1.175, 1.255]

  const
    angle = (i / childCount) * Math.PI - decalangle[childCount - 1],
    localX = (r[childCount - 1] * Math.cos(angle)),
    localY = (r[childCount - 1] * Math.sin(angle)),
    x = station.x + localX,
    y = station.y + localY

  return {localX, localY, x, y}
}

export const troncateStationTitle = (str, size = 200) => {

  const numberOfLetters = (size * .09) - 4
  return str.length >= numberOfLetters ? `${str.slice(0, numberOfLetters)}...` : str
}

export const endDestination = (end) => end.destination || end.goto

export const isStart = d => d.data.node.start
