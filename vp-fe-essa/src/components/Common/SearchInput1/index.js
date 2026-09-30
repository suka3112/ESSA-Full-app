import React, { useState, useRef, useEffect } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import {
    SearchContainer, SearchInputTable, SearchIconWrapper, Dropdown, DropdownItem
} from 'components/Common/TableComponent/TableComponent.style';
import { TCCheckBox } from '../TableComponent/TableComponent.mui.style';

const SearchInput = ({ placeholder, showDropdown = false, inputValue, setInputValue }) => {
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const searchRef = useRef(null);

    const options = ["Option 1", "Option 2", "Option 3", "Option 4"]; // Sample options

    const handleInputClick = () => {
        if (showDropdown) {
            setDropdownOpen(true);
        }
    };

    const handleInputChange = (event) => {
        if (!showDropdown) {
            setInputValue(event.target.value);
        }
    };

    const handleOptionChange = (option) => {
        setSelectedOptions((prevSelected) =>
            prevSelected.includes(option)
                ? prevSelected.filter((item) => item !== option) // Remove if already selected
                : [...prevSelected, option] // Add if not selected
        );
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <SearchContainer ref={searchRef}>
            <SearchIconWrapper>
                <SearchIcon fontSize="small" />
            </SearchIconWrapper>
            <SearchInputTable
                type="text"
                placeholder={placeholder}
                value={showDropdown ? selectedOptions.join(", ") : inputValue}
                onClick={handleInputClick}
                onChange={handleInputChange}
                readOnly={showDropdown}
            />
            {showDropdown && dropdownOpen && (
                <Dropdown>
                    {options.map((option, index) => (
                        <DropdownItem key={index}>
                            <TCCheckBox
                                checked={selectedOptions.includes(option)}
                                onChange={() => handleOptionChange(option)}
                            />
                            <label>{option}</label>
                        </DropdownItem>
                    ))}
                </Dropdown>
            )}
        </SearchContainer>
    );
};

export default SearchInput;
