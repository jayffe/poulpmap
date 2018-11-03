import {randomID} from "./misc"


/**
 * Les types de contenus
 */
export const TYPES = {
  START: "start",
  END: "end",
  EXIT: "exit",
  GOTO: "goto",
  CONTENT: "content",
  SEQUENCE: "sequence",
  CHAPITRE: "chapitre",
  CONDITION: "condition",
  CHOICE: "choice",
  FAKE: "fake"
}

export const fake = () => ({
  _type: TYPES.FAKE,
  id: `fake_${randomID()}`,
  sequences: [],
  contents: [],
  outputs: []
})

export const chapitre = () => {

  const id = randomID()

  return {
    _type: TYPES.CHAPITRE,
    id,
    name: "Chapitre",
    icon: "",
    description: "",
    sequences: [
      sequenceStart(id),
      sequenceEnd(id)
    ]
  }

}

export const chapitreStart = ()=>({start:true,...chapitre()})

export const end = (id) => ({
  _type: TYPES.END,
  id : `${id}||${randomID()}`
})

export const sequence = (chapitreID) => {

  const id = `${chapitreID}__${randomID()}`

  return {
    _type: TYPES.SEQUENCE,
    id,
    name: "Sequence",
    type: "",
    contents: [
      contentStart(id),
      contentEnd(id)
    ],
  }
}

export const sequenceStart = (chapitreID)=>({start:true,...sequence(chapitreID)})

export const sequenceEnd = (chapitreID) => end(`${chapitreID}__${randomID()}.${randomID()}`)

export const sequenceCondition = (chapitreID) => {

  const id = `${chapitreID}__${randomID()}`

  return {
    _type: TYPES.CONDITION,
    id,
    name: "Condition",
    contents: [
      contentStart(id)
    ]
  }
}

export const content = (sequenceID) => {

  const id = `${sequenceID}.${randomID()}`

  return {
    _type: TYPES.CONTENT,
    id,
    name: "Content",
    outputs: [contentChoice(id)],
  }
}

export const contentStart = (sequenceID) => ({start: true,...content(sequenceID)})

export const contentEnd = (sequenceID) => end(`${sequenceID}.${randomID()}`)

export const contentChoice = (contentID) => ({
  _type: TYPES.CHOICE,
  id: `${contentID}||${randomID()}`,
  choice:""
})

