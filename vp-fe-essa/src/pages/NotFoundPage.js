import React from 'react'
import styled from 'styled-components'
import { Typography } from '@mui/material'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
`
const Title = styled(Typography)`
  font-weight: bold;
  padding-bottom: 10px;
`
const SubTitle = styled(Typography)``

const NotFoundPage = () => {
  return (
    <Container>
      <Title variant="h5">Oops!</Title>
      <SubTitle>Looks like the page is not found!</SubTitle>
    </Container>
  )
}

export default NotFoundPage
