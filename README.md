# PoulpMap

PoulpMap is an interactive tool for creating stories in a visual way with the help of [D3js](https://d3js.org/).
It is originally intended to work with the PoulpStudio project.

## Installation


This is a [Node.js](https://nodejs.org/en/) module available through the npm registry.

Installation is done using the
[`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```bash
npm install poulmap
```

## Usage

Import in your project
```jsx
import PoulpMap from "poulpmap"
```

Initialise a map with options :
```jsx
const map = new PoulpMap(this.node, {
      width: 500,
      height: 300,
      onChange: ( updatedJSON ) => {
        // do stuff with updated json ... 
      },
      setSequence: ( sequenceID ) => {
        // sequenceID selected ...
      },
      setChapitre: ( chapitreID ) => {
        // chapitreID selected ...
      },
      onClickNode: (node, coords)=>{
        // do stuff with selected node and coords ...
      }
})
```

When the map is initialised, you can call independently the type of render you want :
If you want to render a particular chapter or sequence, you need to provide the desired id:
```jsx
map.Chapitres(chapitres)
// or
map.Sequences(chapitres, chapitreID)
// or
map.Contents( chaptersJSON , sequenceID)
```

## Options

### gridSize

- Type: `Array`
- Default: `[180, 360]`

Define the grid size to place elements with the right spacing

### chapitreRadius

- Type: `number`
- Default: `100`

### chapitreLinkSize

- Type: `number`
- Default: `37`

### chapitreLinkColor

- Type: `string`
- Default: `"#192440"`

### chapitreStroke

- Type: `number`
- Default: `25`

### sequenceColor

- Type: `string`
- Default: `"#4DCF7D"`

### sequenceLinkSize

- Type: `number`
- Default: `5`

### sequenceLinkColor

- Type: `string`
- Default: `"#fff"`

### sequenceBacklineColor

- Type: `string`
- Default: `"#306D88"`

### sequenceBacklineSize

- Type: `number`
- Default: `46`

### sequenceHeight

- Type: `number`
- Default: `40`

### sequenceWidth

- Type: `number`
- Default: `200`

### conditionColor

- Type: `string`
- Default: `"#36ACC8"`

### conditionRadius

- Type: `number`
- Default: `80`

### contentLinkSize

- Type: `number`
- Default: `5`

### contentLinkColor

- Type: `string`
- Default: `"#192440"`

### exitColor

- Type: `string`
- Default: `"#e2305c"`

### pointerRadius

- Type: `number`
- Default: `16`

### linkColor

- Type: `string`
- Default: `#1F5B76`

### gotoColor

- Type: `string`
- Default: `#fe8549`

### onChange ( newStoryJSON )

When something change on the map, the new json is sent to this function
So you can get this json, save it where you want and give it back to the map 
to see the results


### onClickNode ( node )

When a node is clicked on the map, this method is fired

### onDragEnd ( node )

When a drag action from a pointer is finished on a node, this method is fired with the node hovered







