import _ from 'lodash'

const generateLayout = () => {
  return {
    dockbox: {
      mode: 'horizontal',
      children: [
        {
          tabs: [
            {id: 'tab1', title: 'tab1', content: <div>Hello World</div>}
          ]
        }
      ]
    }
  }
}

export default generateLayout;