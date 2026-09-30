import * as MuiIcons from '@mui/icons-material';
import PropTypes from 'prop-types';

const Icon = ({ iconName, iconColor, fontSize = '20px', cursor, className }) => {
  const MuiIconComponent = MuiIcons[iconName]; // Dynamically get the icon component

  if (!MuiIconComponent) {
    console.warn(`Icon "${iconName}" not found in Material UI Icons`);
    return null; // Avoid rendering text if the icon doesn't exist
  }

  return (
    <MuiIconComponent
      className={className}
      style={{
        fontSize,
        cursor,
        color: iconColor || 'inherit'
      }}
    />
  );
};

export default Icon;

Icon.propTypes = {
  iconName: PropTypes.string.isRequired,
  iconColor: PropTypes.string,
  fontSize: PropTypes.string,
  cursor: PropTypes.string,
  className: PropTypes.string
};

Icon.defaultProps = {
  iconColor: '',
  fontSize: '20px',
  cursor: 'pointer',
  className: ''
};
