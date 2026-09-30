import { useState } from 'react';

const useTableFeatures = (initialPage = 1, initialRowsPerPage = 50, initialPageMeta = {}, initialListData = []) => {
  const [page, setPage] = useState(initialPage);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [search, setSearch] = useState("");

  const [listData, setListData] = useState(initialListData);
  const [pageMeta, setPageMeta] = useState(initialPageMeta);
  const [loader, setLoader] = useState(true);
  const [orderBy, setOrderBy] = useState(null);
  const [order, setOrder] = useState('')

  const handleNextPage = () => setPage((prevPage) => prevPage + 1);
  const handlePrevPage = () => setPage((prevPage) => Math.max(prevPage - 1, 1));
  const handlePage = (pageNumber) => setPage(pageNumber);
  const handlePerPage = (perPage) => {
    setRowsPerPage(perPage);
    setPage(1);
  };

  const handleSearchValue = (e) => {
    setSearch(e);
    setPage(1);
  };

  const tableProps = {
    setPage: setPage,
    pageMeta: pageMeta,
    handlePageChange: (value) => handlePage(value),
    handleNextPage: () => handleNextPage(),
    handlePrevPage: () => handlePrevPage(),
    handlePage: (e) => handlePage(e),
    page: page,
    isLoading: loader,
    orderBy: orderBy,
    setOrderBy: setOrderBy,
    order: order,
    setOrder: setOrder,
    handlePerPage: (e) => handlePerPage(e),
    rowsPerPage: rowsPerPage,
  };

  return {
    page,
    setPage,
    rowsPerPage, setRowsPerPage,
    search, setSearch,
    listData,
    setListData,
loader,
    handleSearchValue,
    setLoader, setPageMeta,
    order, orderBy,
    tableProps
  };
};

export default useTableFeatures;
