import {getSequence, getContent, getChapitre, getContentEnds} from "./jsonNav";
import {content, TYPES, contentChoice} from "./nodeTypes";
import {splitID} from "./misc";


export const addContent = (chapitres, endFromOrPosition, endTo) => {

  const {id} = endFromOrPosition

  const sequence = getSequence(chapitres,id)
  const newContent = content(sequence.id)

  sequence.contents.push(newContent)

  if(endFromOrPosition.x){

    const {x,y} = endFromOrPosition
    newContent.position = {x,y}
    return chapitres
  }

  endFromOrPosition.destination = newContent.id

  if(endTo){

    newContent._type = TYPES.EXIT
    newContent.end = endTo.id
    delete newContent.name
    delete newContent.choices
  }

  return chapitres
}

export const addContentOutput = (chapitres, content) => {

  const ends = content.choices

  if (ends.length < 5) {
    content.choices.push(contentChoice(content.id))
  }

  return chapitres
}

export const removeContentOutput = (chapitres, pointer) => {

  const {id} = pointer.end

  const content = getContent(chapitres,splitID(id).contentID)

  const index = content.choices.findIndex(o => o.id === id)

  content.choices.splice(index, 1)

  return chapitres
}

export const removeContentLink = (chapitres, pointer) => {

  if(pointer.end.goto) delete pointer.end.goto

  if (!pointer.end.destination) return chapitres

  const toContent = getContent(chapitres, pointer.end.destination)

  delete pointer.end.destination

  const gotoFound = findFirstConnectedGoto(chapitres, toContent)

  if(gotoFound){

    gotoFound.destination = gotoFound.goto
    delete gotoFound.goto

  }else{

    const {x, y} = pointer.to
    toContent.position = {x, y}
  }

  if(toContent._type === TYPES.EXIT)
    removeContent(chapitres, toContent)

  return chapitres
}

export const connectContents = (chapitres, pointer, contentTo) => {

  if(!contentTo.position){

    console.log("got to content", contentTo)

    return chapitres
  }

  pointer.end.destination = contentTo.id
  delete contentTo.position

  return chapitres
}

export const removeContent = (chapitres, nodeOrContent) => {

  if(nodeOrContent.pointers)
    nodeOrContent.pointers.forEach(e => removeContentLink(chapitres, e))

  const content = nodeOrContent.data ? nodeOrContent.data.node : nodeOrContent

  const sequence = getSequence(chapitres,content.id)

  const index = sequence.contents.findIndex(c=>c.id === content.id)

  sequence.contents.splice(index,1)

  return chapitres
}

export const updateContent = (chapitres, content, cb) => {

  const {chapitreID, sequenceID} = splitID(content.id)

  const indexchapitre = chapitres.findIndex(c=>c.id === chapitreID)
  const indexSequence = getChapitre(chapitres,chapitreID).sequences.findIndex(s=>s.id === sequenceID)
  const indexContent = getSequence(chapitres,sequenceID).contents.findIndex(s=>s.id === content.id)

  chapitres[indexchapitre].sequences[indexSequence].contents[indexContent] = content

  return cb(chapitres)
}

export const gotoContent = (chapitres, pointer, content) => {

  if(content._type === TYPES.CONTENT)
    pointer.end.goto = content.id

  return chapitres
}

export const findFirstConnectedGoto = (chapitres, contentTo) => {

  const contents = getSequence(chapitres,contentTo.id).contents.filter(s=>s._type===TYPES.CONTENT)

  for(let i = 0 ; i < contents.length ; i++){

    const content = contents[i]
    const end = getContentEnds(content).find(e=>e.goto && splitID(e.goto).contentID === contentTo.id)

    if(end) return end
  }

  return false
}