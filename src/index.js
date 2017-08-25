import React, {Component, Children, cloneElement} from 'react'
import PropTypes from 'prop-types'
import HintStyles from './Hint.css';
import generateStyles from './generateStyles';

const m = (...objs) => Object.assign({}, ...objs)

class FlipPage extends Component {
  constructor (props) {
    super(props)

    this.state = {
      page: 0,             // current index of page
      startY: -1,          // start position of swipe
      diffY: 0,            // diffYerence between last swipe position and current position
      timestamp: 0,        // time elapsed between two swipes
      angle: 0,            // rotate angle of half page
      rotate: 0,           // absolute value of above, limited to 45° if necessary
      direction: '',       // original swipe direction
      lastDirection: '',   // last registered swipe direction
      secondHalfStyle: {}, // transform style of bottom half
      firstHalfStyle: {},  // transform style of top half
      hintVisible: false   // indicates if the hint is visible
    }

    // binding events
    this.startMoving = this.startMoving.bind(this)
    this.moveGesture = this.moveGesture.bind(this)
    this.stopMoving = this.stopMoving.bind(this)
    this.reset = this.reset.bind(this)

    this.transition = `transform ${this.props.animationDuration / 1000}s ease-in-out`
  }

  componentDidMount () {
    if (this.props.showHint) {
      this.hintTimeout = setTimeout(() => this.showHint(), 1000)
    }
  }

  componentWillUnmount () {
    clearTimeout(this.hintTimout);
  }

  showHint () {
    this.setState({ hintVisible: true }, () => {
      this.hintHideTimeout = setTimeout(() => this.setState({ hintVisible: false }), 4000)
    })
  }

  isLastPage () {
    return this.state.page + 1 === Children.count(this.props.children)
  }

  isFirstPage () {
    return this.state.page === 0
  }

  getHeight () {
    return `${this.props.height}px`
  }

  getHalfHeight () {
    return `${this.props.height / 2}px`
  }

  getWidth () {
    return `${this.props.width}px`
  }

  getHalfWidth () {
    return `${this.props.width / 2}px`
  }

  startMoving (e) {
    e.preventDefault()

    const posX = e.pageX || e.touches[0].pageX
    const posY = e.pageY || e.touches[0].pageY

    this.setState({
      startX: posX,
      startY: posY
    })
  }

  moveGesture (e) {
    e.preventDefault()

    const posX = e.pageX || e.touches[0].pageX
    const posY = e.pageY || e.touches[0].pageY

    const { orientation, treshold, maxAngle, perspective } = this.props
    const { startX, startY, diffX, diffY, direction, lastDirection } = this.state

    if (startY !== -1) {
      const newDiffY = posY - startY
      const newDiffX = posX - startX
      const diffToUse = (direction === 'up' || direction === 'down') ? newDiffY : newDiffX
      const angle = (diffToUse / 250) * 180
      let useMaxAngle = false
      if (direction === 'up' || direction === 'left') {
        useMaxAngle = this.isLastPage()
      } else if (direction === 'down' || direction === 'right') {
        useMaxAngle = this.isFirstPage()
      }

      const rotate = Math.min(Math.abs(angle), useMaxAngle ? maxAngle : 180)

      let nextDirection = ''

      // determine direction to prevent two-directions swipe
      if (direction === '' && (Math.abs(newDiffX) > treshold || Math.abs(newDiffY) > treshold)) {

        if (newDiffY < 0 && orientation === 'vertical') {
          nextDirection = 'up'
        } else if (newDiffY > 0 && orientation === 'vertical') {
          nextDirection = 'down'
        } else if (newDiffX < 0 && orientation === 'horizontal') {
          nextDirection = 'left'
        } else if (newDiffX > 0 && orientation === 'horizontal') {
          nextDirection = 'right'
        }

        this.setState({direction: nextDirection})
      }

      // set the last direction
      let nextLastDirection = lastDirection
      if (this.state.diffY > newDiffY) {
        nextLastDirection = 'up'
      } else if (this.state.diffY < newDiffY) {
        nextLastDirection = 'down'
      } else if (this.state.diffX > newDiffX) {
        nextLastDirection = 'right'
      } else if (this.state.diffX < newDiffX) {
        nextLastDirection = 'left'
      }

      this.setState({
        angle: angle,
        rotate: rotate,
        timestamp: Date.now(),
        diffY: newDiffY,
        diffX: newDiffX,
        lastDirection: nextLastDirection
      })

      // flip bottom
      if (newDiffY < 0 && this.state.direction === 'up') {
        this.setState({
          angle: angle,
          secondHalfStyle: {
            transform: `perspective(${perspective}) rotateX(${rotate}deg)`
          }})
      } else if (newDiffY > 0 && this.state.direction === 'down') {
        this.setState({
          angle: angle,
          firstHalfStyle: {
            transform: `perspective(${perspective}) rotateX(-${rotate}deg)`,
            zIndex: 2 // apply a z-index to pop over the back face
          }})
      } else if (newDiffX < 0 && this.state.direction === 'left') {
        this.setState({
          angle: angle,
          secondHalfStyle: {
            transform: `perspective(${perspective}) rotateY(-${rotate}deg)`
          }})
      } else if (newDiffX > 0 && this.state.direction === 'right') {
        this.setState({
          angle: angle,
          firstHalfStyle: {
            transform: `perspective(${perspective}) rotateY(${rotate}deg)`,
            zIndex: 2 // apply a z-index to pop over the back face
          }})
      }
    }
  }

  gotoNextPage () {
    if (this.isLastPage()) return

    const { perspective, orientation, onPageChange, animationDuration } = this.props;
    const { page } = this.state;

    let secondHalfTransform = `perspective(${perspective}) `

    if (orientation === 'vertical') {
      secondHalfTransform += 'rotateX(180deg)'
    } else {
      secondHalfTransform += 'rotateY(-180deg)'
    }

    this.setState({
      firstHalfStyle: {
        transition: this.transition,
        transform: '',
        zIndex: 'auto'
      },

      secondHalfStyle: {
        transition: this.transition,
        transform: secondHalfTransform
      }
    }, () => {
      setTimeout(() => {
        this.setState({
          secondHalfStyle: {},
          page: page + 1
        }, () => {
          onPageChange(page)
        })
      }, animationDuration)
    })
  }

  gotoPreviousPage () {
    if (this.isFirstPage()) return

    const { perspective, orientation, onPageChange, animationDuration } = this.props;
    const { page } = this.state;

    let firstHalfTransform = `perspective(${perspective}) `

    if (orientation === 'vertical') {
      firstHalfTransform += 'rotateX(-180deg)'
    } else {
      firstHalfTransform += 'rotateY(180deg)'
    }

    this.setState({
      firstHalfStyle: {
        transition: this.transition,
        transform: firstHalfTransform,
        zIndex: 2
      },

      secondHalfStyle: {
        transition: this.transition,
        transform: ''
      }
    }, () => {
      setTimeout(() => {
        this.setState({
          firstHalfStyle: {},
          page: page - 1
        }, () => {
          onPageChange(page)
        })
      }, animationDuration)
    })
  }

  stopMoving (e) {
    const { timestamp, angle, direction, lastDirection } = this.state;
    const delay = Date.now() - this.state.timestamp

    const goNext = !this.isLastPage() && (
      angle <= -90 ||
        (delay <= 20 && direction === 'up' && lastDirection === 'up') ||
        (delay <= 20 && direction === 'right' && lastDirection === 'right')
      )
    const goPrevious = !this.isFirstPage() && (
      angle >= 90 ||
        (delay <= 20 && direction === 'down' && lastDirection === 'down') ||
        (delay <= 20 && direction === 'left' && lastDirection === 'left')
      )

    // reset everything
    this.reset()

    if (goNext) {
      this.gotoNextPage()
    }

    if (goPrevious) {
      this.gotoPreviousPage()
    }
  }

  _beforeItem() {
    const { children, firstComponent } = this.props;
    return !this.isFirstPage()
      ? children[this.state.page - 1]
      : firstComponent
  }

  _afterItem() {
    const { children, lastComponent } = this.props;
    return !this.isLastPage()
      ? children[this.state.page + 1]
      : lastComponent
  }

  reset () {
    this.setState({
      startY: -1,
      startX: -1,
      angle: 0,
      rotate: 0,
      direction: '',
      lastDirection: '',
      secondHalfStyle: {
        transition: this.transition
      },
      firstHalfStyle: {
        transition: this.transition
      }
    })
  }

  renderPage (_page, key) {
    const height = this.getHeight()
    const halfHeight = this.getHalfHeight()
    const width = this.getWidth()
    const halfWidth = this.getHalfWidth()

    const complementaryStyle = {
      height: height
    }

    const pageItem = cloneElement(_page, {
      style: Object.assign({}, _page.props.style, complementaryStyle)
    })

    const { page, direction, rotate } = this.state;
    const { orientation, uncutPages, maskOpacity, pageBackground, animationDuration } = this.props
    const style = generateStyles(
      page,
      key,
      direction,
      rotate,
      uncutPages,
      width,
      halfWidth,
      height,
      halfHeight,
      orientation,
      maskOpacity,
      pageBackground,
      animationDuration
    )

    const {
      container,
      part,
      visiblePart,
      firstHalf,
      secondHalf,
      face,
      back,
      before,
      after,
      cut,
      pull,
      gradient,
      gradientSecondHalfBack,
      gradientFirstHalfBack,
      gradientSecondHalf,
      gradientFirstHalf,
      mask,
      zIndex
    } = style

    const beforeItem = this._beforeItem()
    const afterItem = this._afterItem()

    const clonedBeforeItem = beforeItem && cloneElement(beforeItem, {
      style: Object.assign({}, beforeItem.props.style, complementaryStyle)
    })

    const clonedAfterItem = afterItem && cloneElement(afterItem, {
      style: Object.assign({}, afterItem.props.style, complementaryStyle)
    })

    return (
      <div
        key={key}
        onMouseDown={this.startMoving}
        onTouchStart={this.startMoving}
        onMouseMove={this.moveGesture}
        onTouchMove={this.moveGesture}
        onMouseUp={this.stopMoving}
        onTouchEnd={this.stopMoving}
        onMouseLeave={this.reset}
        style={container}
      >
        <div style={m(part, before, cut)}>
          {clonedBeforeItem}
          <div style={mask} />
        </div>
        <div style={m(part, cut, after)}>
          <div style={pull}>{clonedAfterItem}</div>
          <div style={mask} />
        </div>
        <div style={m(part, visiblePart, firstHalf, this.state.firstHalfStyle)}>
          <div style={face}>
            <div style={m(cut, zIndex)}>{pageItem}</div>
            <div style={m(gradient, gradientFirstHalf)} />
          </div>
          <div style={m(face, back)}>
            <div style={cut}>
              <div style={pull}>{clonedBeforeItem}</div>
            </div>
            <div style={m(gradient, gradientFirstHalfBack)} />
          </div>
        </div>
        <div style={m(part, visiblePart, secondHalf, this.state.secondHalfStyle)}>
          <div style={face}>
            <div style={m(cut, zIndex)}>
              <div style={pull}>{pageItem}</div>
            </div>
            <div style={m(gradient, gradientSecondHalf)} />
          </div>
          <div style={m(face, back)}>
            <div style={m(part, after, cut)}>
              {clonedAfterItem}
            </div>
            <div style={m(gradient, gradientSecondHalfBack)} />
          </div>
        </div>
      </div>
    )
  }

  render () {
    const { style, children, className, orientation } = this.props;
    const { hintVisible } = this.state;

    const containerStyle = m(style, {
      height: this.getHeight(),
      position: 'relative',
      width: this.getWidth()
    })

    // all the pages are rendered once, to prevent glitching
    // (React would reload the child page and cause a image glitch)
    return (
      <div style={containerStyle} className={className}>
        {Children.map(children, (page, key) => this.renderPage(page, key))}
        {hintVisible && <div className={`rfp-hint rfp-hint--${orientation}`}></div>}
      </div>
    )
  }
}

FlipPage.defaultProps = {
  orientation: 'vertical',
  animationDuration: 200,
  treshold: 10,
  maxAngle: 45,
  maskOpacity: 0.4,
  perspective: '130em',
  pageBackground: '#fff',
  firstComponent: null,
  lastComponent: null,
  showHint: false,
  uncutPages: false,
  style: {},
  height: 480,
  width: 320,
  onPageChange: () => {},
  className: ''
};

FlipPage.propTypes = {
  orientation: (props, propName, componentName) => {
    if (!/(vertical|horizontal)/.test(props[propName])) {
      return new Error(
        'Invalid prop `' + propName + '` supplied to ' +
        ' `' + componentName + '`. Expected `horizontal` or `vertical`. Validation failed.'
      )
    }
  },
  animationDuration: PropTypes.number,
  treshold: PropTypes.number,
  maxAngle: PropTypes.number,
  maskOpacity: PropTypes.number,
  perspective: PropTypes.string,
  pageBackground: PropTypes.string,
  firstComponent: PropTypes.element,
  lastComponent: PropTypes.element,
  showHint: PropTypes.bool,
  uncutPages: PropTypes.bool,
  style: PropTypes.object,
  height: PropTypes.number,
  width: PropTypes.number,
  onPageChange: PropTypes.func,
  className: PropTypes.string
}

export default FlipPage
