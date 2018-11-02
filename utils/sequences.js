import {TYPES, sequence, sequenceCondition, contentEnd} from "./nodeTypes"
import {splitID} from "./misc"
import {getChapitre, getSequence, getSequenceEnds} from "./jsonNav"


export const addSequence = (chapitres, endFromOrPosition, endTo, cb) => {

  const {id} = endFromOrPosition

  const chapitre = getChapitre(chapitres, id)
  const newSequence = sequence(chapitre.id)

  chapitre.sequences.push(newSequence)

  if(endFromOrPosition.x){

    const {x,y} = endFromOrPosition
    newSequence.position = {x,y}
    return chapitres
  }

  endFromOrPosition.destination = newSequence.contents[0].id

  if (endTo) {

    newSequence._type = TYPES.EXIT
    newSequence.end = endTo.id

    //delete newSequence.contents
    delete newSequence.name
    delete newSequence.type

    return chapitres
  }

  if(cb)
    cb(newSequence)

  return chapitres
}

export const addCondition = (chapitres, pointer) => {

  const {id} = pointer.end

  const chapitre = getChapitre(chapitres, id)
  const newCondition = sequenceCondition(chapitre.id)

  chapitre.sequences.push(newCondition)

  pointer.end.destination = newCondition.contents[0].id

  return chapitres
}

export const addSequenceEnd = (chapitres, sequence, cb) => {

  const ends = sequence.contents.filter(c => c._type === TYPES.END)

  if (ends.length < 5) {

    const end = contentEnd(sequence.id)

    sequence.contents.push(end)

    if(cb) cb(end)
  }

  return chapitres
}

export const removeSequenceEnd = (chapitres, pointer) => {

  const {id} = pointer.end

  const sequence = getSequence(chapitres, id)

  const index = sequence.contents.findIndex(c => c.id === id)

  sequence.contents.splice(index, 1)

  return chapitres
}

export const connectSequences = (chapitres, pointer, sequence) => {

  // TODO: empecher de connecter à un parent orphelin de la sequence actuelle ( sinon boucle )

  if(!sequence.position) {
    return chapitres
  }

  pointer.end.destination = sequence.contents[0].id
  delete sequence.position

  return chapitres
}

export const gotoSequence = (chapitres, pointer, sequence) => {

  if(sequence._type === TYPES.SEQUENCE || sequence._type === TYPES.CONDITION)
    pointer.end.goto = sequence.contents[0].id

  return chapitres
}

export const removeSequenceLink = (chapitres, pointer) => {

  if(pointer.end.goto) delete pointer.end.goto

  if (!pointer.end.destination) return chapitres

  const toSequence = getSequence(chapitres, pointer.end.destination)

  delete pointer.end.destination

  const gotoFound = findFirstConnectedGoto(chapitres, toSequence)

  if(gotoFound){

    gotoFound.destination = gotoFound.goto
    delete gotoFound.goto

  }else{

    const {x, y} = pointer.to
    toSequence.position = {x, y}
  }

  // on supprime la sequence liée si il s'agit d'un exit, pas la peine de la conserver...
  if(toSequence._type === TYPES.EXIT)
    removeSequence(chapitres, toSequence)

  return chapitres
}

export const removeSequence = (chapitres, nodeOrSequence) => {

  // on delie toutes les sorties
  if(nodeOrSequence.pointers)
    nodeOrSequence.pointers.forEach(e => removeSequenceLink(chapitres, e))

  // puis toutes les entrées
  const sequence = nodeOrSequence.data ? nodeOrSequence.data.node : nodeOrSequence

  // enfin on supprime
  const {chapitreID} = splitID(sequence.id)
  const sequences = chapitres.find(ch => ch.id === chapitreID).sequences
  const index = sequences.findIndex(s => s.id === sequence.id)
  sequences.splice(index, 1)

  return chapitres
}

export const updateSequence = (chapitres, sequence, cb) => {

  const {chapitreID, sequenceID} = splitID(sequence.id)

  const indexchapitre = chapitres.findIndex(c=>c.id === chapitreID)
  const indexSequence = getChapitre(chapitres,chapitreID).sequences.findIndex(s=>s.id === sequenceID)

  chapitres[indexchapitre].sequences[indexSequence] = sequence

  return cb(chapitres)
}

export const switchSequenceTo = (chapitres, sequence, type) => {

  sequence._type = type
  return chapitres
}

// TODO : il existe une fonction findFirstConnectedGoto par type... on pourrait rassembler tout ca en une
export const findFirstConnectedGoto = (chapitres, sequenceTo) => {

  const sequences = getChapitre(chapitres,sequenceTo.id).sequences.filter(s=>s._type===TYPES.SEQUENCE)

  for(let i = 0 ; i < sequences.length ; i++){

    const sequence = sequences[i]
    const end = getSequenceEnds(sequence).find(e=>e.goto && splitID(e.goto).sequenceID === sequenceTo.id)

    if(end) return end
  }

  return false
}
