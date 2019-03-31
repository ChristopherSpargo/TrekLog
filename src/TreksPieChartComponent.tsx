
import React from 'react'
import { PieChart } from 'react-native-svg-charts'
import { G, Text } from 'react-native-svg'
import { observer, inject } from 'mobx-react'
import { TREK_SELECT_BITS } from './TrekInfoModel';

@inject('uiTheme')
@observer
class TreksPieChart extends React.Component <{
  uiTheme ?: any
  selected ?: number,
  selectFn ?: Function,
  data : any[]         // object with all non-gps information about the Trek
}, {} > {

    selectType = (type: string) => {
      this.props.selectFn(type, false);
    }

    toggleType = (type: string) => {
        this.props.selectFn(type, true);
      }
  
      render() {

        const pieData = this.props.data
            .map((item, index) => ({
                value: item.value,
                type: item.type,
                svg: { fill: item.color, 
                       onLongPress: this.selectType.bind(this, item.type),
                       onPress: this.toggleType.bind(this, item.type)},
                key: `pie-${index}`,
                arc: ((this.props.selected === TREK_SELECT_BITS['All']) || 
                      (TREK_SELECT_BITS[item.type] & this.props.selected)) ? 
                      {outerRadius: '110%', innerRadius: 24} : {},                
            }))

        const Labels = ({ slices }) => {
            return slices.map((slice, index) => {
                const { pieCentroid, data } = slice;
                return (
                    <G key={ index }>
                        <Text
                            x={pieCentroid[ 0 ]}
                            y={pieCentroid[ 1 ]}
                            fill={'white'}
                            textAnchor={'middle'}
                            alignmentBaseline={'middle'}
                            fontSize={18}
                            stroke={'white'}
                            strokeWidth={0.2}
                        >
                          {data.value}
                        </Text>
                    </G>
                )
            })
        }

        return (
            <PieChart
                style={ { height: 185, width: 200 } }
                data={ pieData }
                sort={() => 0}
                innerRadius={ 20 }
                outerRadius={ 75 }
                labelRadius={ 85 }
            >
                <Labels slices/>
            </PieChart>
        )
    }

}

export default TreksPieChart