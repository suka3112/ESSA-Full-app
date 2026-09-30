import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked'

function CustomStepIcon(props) {
  const { active, completed } = props

  if (completed) {
    //Completed step
    return <CheckCircleIcon style={{ color: '#1f6ea9' }} />
  }

  if (active) {
    //Active step
    return <RadioButtonCheckedIcon style={{ color: '#1f6ea9' }} />
  }

  //Empty step
  return <RadioButtonUncheckedIcon style={{ color: '#ccc' }} />
}
export default CustomStepIcon
