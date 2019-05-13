import {TYPES} from "./nodeTypes";
import {endDestination, splitID} from "./misc";

const getEnds = (arr)=> arr ? arr.filter(s => s._type === TYPES.END) : []

/* Chapitres
-------------------------------------------------------------------------------------------------*/

export const getChapitre = (chapitres, chapitreID) => chapitres.find(ch => ch.id === splitID(chapitreID).chapitreID)

export const getChapitreEnds = (d) => getEnds(d.sequences)


/* Sequences
-------------------------------------------------------------------------------------------------*/

export const getSequences = (chapitres, cid) => chapitres.find(c => c.id === cid).sequences

export const getSequenceEnds = (d) => getEnds(d.contents)

export const getSequence = (chapitres, id)=>{

  const {sequenceID, chapitreID} = splitID(id)

  return chapitres.find(ch => ch.id === chapitreID).sequences.find(s => s.id === sequenceID)
}


/* Contents
-------------------------------------------------------------------------------------------------*/

export const getContents = (chapitres, sid) => chapitres.find(ch => ch.id === splitID(sid).chapitreID).sequences.find(s => s.id === sid).contents

export const getContentEnds = (d) => d.choices || []

export const getContent = (chapitres, id) => {

  const {sequenceID, chapitreID} = splitID(id)

  return chapitres.find(ch => ch.id === chapitreID)
    .sequences.find(s => s.id === sequenceID)
    .contents.find(c => c.id === id)
}

export const getEndFinalDestination = (chapitres, end)=>{

  if(!end) return false

  if(!endDestination(end)) return false

  const endCurrentChapter = getChapitre(chapitres, end.id)
  const endDestinationChapter = getChapitre(chapitres, endDestination(end))


  if(!endDestinationChapter) return false

  if(endCurrentChapter.id !== endDestinationChapter.id){

    return endDestinationChapter
  }


  const endDestinationSequence = getSequence(chapitres,endDestination(end))

  if(!endDestinationSequence) return false

  if(endDestinationSequence.end){

    const e = getChapitreEnds(endDestinationChapter).find(e=>e.id===endDestinationSequence.end)
    return getEndFinalDestination(chapitres, e )
  }

  return endDestinationSequence
}


