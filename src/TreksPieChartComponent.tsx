
import React from 'react'
import { PieChart } from 'react-native-svg-charts'
import { G, Text } from 'react-native-svg'
import { observer, inject } from 'mobx-react'
import { TREK_SELECT_BITS } from './TrekInfoModel';

@inject('uiTheme')
@observer
class TreksPieChart extends React.Component <{
  height ?: number,
  width  ?: number,
  labelColor : string,
  uiTheme ?: any
  selected ?: number,
  selectFn ?: Function,
  data : any[]         // object with graph items
}, {} > {

    selectType = (type: string) => {
      this.props.selectFn(type, false);
    }

    toggleType = (type: string) => {
        this.props.selectFn(type, true);
      }
  
      render() {

        const { fontRegular } = this.props.uiTheme;
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
                            fill={this.props.labelColor}
                            textAnchor={'middle'}
                            alignmentBaseline={'middle'}
                            fontSize={20}
                            fontFamily={fontRegular}
                            stroke={this.props.labelColor}
                            strokeWidth={0.2}
                        >
                          {data.value}
                        </Text>
                    </G>
                )
            })
        }
        const chartHt = this.props.height || 185;
        const chartWd = this.props.width || 200;
        return (
            <PieChart
                style={ { height: chartHt, width: chartWd } }
                data={ pieData }
                sort={() => 0}
                innerRadius={ "25%" }
                outerRadius={ "90%" }
                labelRadius={ "60%" }
            >
                <Labels slices/>
            </PieChart>
        )
    }

}

export default TreksPieChart