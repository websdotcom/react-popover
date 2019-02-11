import createReactClass from 'create-react-class'
import DOM from 'react-dom-factories'

const PopoverTip = createReactClass({
  name: `tip`,
  render () {
    const { direction } = this.props
    const size = this.props.size || 24
    const isPortrait = direction === `up` || direction === `down`
    const mainLength = size
    const crossLength = size * 2
    const points = (
      direction === `up` ? `0,${mainLength} ${mainLength},0, ${crossLength},${mainLength}`
      : direction === `down` ? `0,0 ${mainLength},${mainLength}, ${crossLength},0`
      : direction === `left` ? `${mainLength},0 0,${mainLength}, ${mainLength},${crossLength}`
      : `0,0 ${mainLength},${mainLength}, 0,${crossLength}`
    )
    const props = {
      className: `Popover-tip`,
      width: isPortrait ? crossLength : mainLength,
      height: isPortrait ? mainLength : crossLength,
    }
    const triangle = DOM.svg(props,
      DOM.polygon({
        className: `Popover-tipShape`,
        points,
      })
    )

    return (
      triangle
    )
  },
})


export {
  PopoverTip as default,
}
