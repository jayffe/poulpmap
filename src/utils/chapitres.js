import {chapitre, sequenceEnd, TYPES} from "./nodeTypes"
import {getChapitre, getChapitreEnds} from "./jsonNav"
import {splitID} from "./misc"
import {removeSequence} from "./sequences"


export const addChapitre = (chapitres, endFromOrPosition, cb) => {

  const newChapitre = chapitre()

  chapitres.push(newChapitre)

  if(endFromOrPosition._type === TYPES.END){

    endFromOrPosition.destination = newChapitre.sequences[0].contents[0].id
  }
  else{

    newChapitre.position = endFromOrPosition
  }

  if(cb){
    cb(newChapitre)
  }

  return newChapitre
}

export const addEndStory = (chapitres, endFromOrPosition) => {

  const end = addChapitre(chapitres, endFromOrPosition, ()=>{})

  end.sequences.length = 1
  end.name = "End"
  end.end = true

  chapitres.push(end)

  return end
}

export const addChapitreEnd = (chapitres, chapitre, cb) => {

  const seqEnd = sequenceEnd(chapitre.id)

  chapitre.sequences.push(seqEnd)

  if(cb) cb(seqEnd)

  return chapitres
}

export const removeChapitreOutput = (chapitres, pointer) => {

  const {id} = pointer.end

  const chapitre = getChapitre(chapitres, splitID(id).chapitreID)

  const index = chapitre.sequences.findIndex(s => s.id === id)

  chapitre.sequences.splice(index, 1)

  return chapitres
}

export const connectChapitres = (chapitres, pointer, chapitre) => {

  if(!chapitre.position){
    console.log("go to chapitre", chapitre)
    return chapitres
  }

  pointer.end.destination = chapitre.sequences[0].contents[0].id
  delete chapitre.position

  return chapitres
}

export const removeChapitreLink = (chapitres, pointer) => {

  if(pointer.end.goto) delete pointer.end.goto

  if (!pointer.end.destination) return chapitres

  const toChapitre = getChapitre(chapitres, pointer.end.destination)

  delete pointer.end.destination

  const gotoFound = findFirstConnectedGoto(chapitres, toChapitre)

  if(gotoFound){

    gotoFound.destination = gotoFound.goto
    delete gotoFound.goto

  }else{

    const {x, y} = pointer.to
    toChapitre.position = {x, y}
  }


  return chapitres
}

export const removeChapitre = (chapitres, node) => {

  // on delie toutes les sorties
  node.pointers.forEach(e => removeChapitreLink(chapitres, e))

  // puis toutes les entrees
  const chapitre = node.data.node

  chapitre.sequences.forEach(sequence=>{
    removeSequence(chapitres,sequence)
  })

  // enfin on supprime
  const index = chapitres.findIndex(ch => ch.id === chapitre.id)
  chapitres.splice(index, 1)

  return chapitres
}

export const updateChapitre = (chapitres, chapitre, cb) => {

  const index = chapitres.findIndex(c=>c.id === chapitre.id)

  chapitres[index] = chapitre

  return cb(chapitres)
}

export const gotoChapitre = (chapitres, pointer, chapitre) => {

  if(chapitre._type === TYPES.CHAPITRE)
    pointer.end.goto = chapitre.sequences[0].contents[0].id

  return chapitres
}

export const findFirstConnectedGoto = (chapitres, chapitreTo) => {

  for(let i = 0 ; i < chapitres.length ; i++){

    const chapitre = chapitres[i]
    const end = getChapitreEnds(chapitre).find(e=>e.goto && splitID(e.goto).chapitreID === chapitreTo.id)

    if(end) return end
  }

  return false
}

