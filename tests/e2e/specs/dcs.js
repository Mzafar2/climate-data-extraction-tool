// https://docs.cypress.io/api/introduction/api.html

describe('E2E test for DCS page with WCS data', () => {
  it('Performs various combination of form changes with expected response', () => {
    cy.visit('/#/downscaled-data')

    // historical
    cy.selectRadio('option-radio-options', 'HISTO')
    cy.get('#rcp_scenario').should('be.hidden')
    cy.get('#historical-date-range').should('be.visible')
    cy.get('#rcp-date-range').should('be.hidden')
    cy.get('#val-radio-user-defined-range').should('be.checked')
    cy.get('#date-historical-start-date').should('not.have.attr', 'required', 'required')
    cy.get('#date-historical-end-date').should('not.have.attr', 'required', 'required')

    // monthly check
    cy.selectVar('#var-sel-time-interval--time-of-year', 'Monthly', 'ENS')
    cy.get('#var-sel-value-type').should('be.disabled')
    cy.get('#date-historical-start-date').should('have.attr', 'required', 'required')
    cy.get('#date-historical-end-date').should('have.attr', 'required', 'required')
    cy.get('#val-radio-20-year-average').should('not.exist')
    cy.get('#wcs-link-list').find('a').should('have.lengthOf', 7)
    cy.get('button#clear-hist-dates-btn').click()
    cy.get('label[for="date-historical-start-date"').contains('This field is required')
    cy.get('label[for="date-historical-end-date"').contains('This field is required')

    // future
    cy.selectRadio('option-radio-options', 'RCP')
    cy.get('#var-sel-value-type').should('be.disabled')
    cy.selectVar('#rcp_scenario', 'High emissions scenario (RCP 8.5)', 'RCP85')
    cy.selectVar('#var-sel-time-interval--time-of-year', 'Spring (March-May)', 'SPRING')
    cy.selectVar('#var-sel-value-type', 'Anomaly values', 'ANO')
    cy.get('#val-radio-20-year-average').should('exist')
  })

  it('Download data as TM, RCP26, Annual, Anomaly, PCTL50, 2099-2100, GeoTIFF', () => {
    cy.visit('/#/downscaled-data')

    // Zoom in to map
    cy.get('a.leaflet-control-zoom-in').scrollIntoView().wait(250).click()
    cy.wait(500) // mimic user pause after a zoom click

    // variable
    cy.selectVar('#var-sel-variable', 'Mean temperature', 'TM')

    // future
    cy.selectRadio('option-radio-options', 'RCP')

    // scenario
    cy.selectVar('#rcp_scenario', 'Low emissions scenario (RCP 2.6)', 'RCP26')

    // time interval
    cy.selectVar('#var-sel-time-interval--time-of-year', 'Annual', 'YEAR')

    // value type
    cy.selectVar('#var-sel-value-type', 'Anomaly values', 'ANO')

    // Ensemble percentile
    cy.get('#var-sel-ensemble-percentile').scrollIntoView().wait(250).should('be.disabled').should('have.value', 'PCTL50')

    // time range type
    cy.selectRadio('option-radio-time-range-type', 'custom')

    // start date
    cy.get('input#date-start-date').clear().type('2099{enter}')

    // end date
    cy.get('input#date-end-date').clear().type('2100{enter}')

    // 20-year average
    cy.get('#var-sel-20-year-average-range').should('be.hidden') // .select('2081-2100').should('have.value', '2081-2100')

    // download format
    cy.selectVar('#raster_download_format', 'GeoTIFF', 'image/tiff')

    // URL download link
    cy.get('#url-download-box').should('be.visible')
    cy.get('#point-download-box').should('be.hidden')

    // visit download link
    cy.get('#wcs-download-links-list').scrollIntoView().wait(250).should('be.visible')
    cy.get('#wcs-download-links-list a:first').should('have.attr', 'href').then((href) => {
      cy.request('GET', href).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.headers['content-disposition']).to.match(/.*geomet-climate-DCS\.TM\.RCP26.*tif.*$/)
      })
    })
  })

  it('Download data as TN, historical, monthly, 1999-11 to 1999-12, GeoTIFF', () => {
    cy.visit('/#/downscaled-data')

    // Zoom in to map
    cy.get('a.leaflet-control-zoom-in').scrollIntoView().wait(250).click()
    cy.wait(500) // mimic user pause after a zoom click
    cy.get('a.leaflet-control-zoom-in').click() // zoom twice
    cy.wait(500)

    // variable
    cy.selectVar('#var-sel-variable', 'Minimum temperature', 'TN')

    // historical
    cy.selectRadio('option-radio-options', 'HISTO')

    // Monthly
    cy.selectVar('#var-sel-time-interval--time-of-year', 'Monthly', 'ENS')

    // Date range
    cy.inputText('#date-historical-start-date', '1999-11{enter}')
    cy.inputText('#date-historical-end-date', '1999-12{enter}')

    // visit download link
    cy.get('#wcs-download-links-list').scrollIntoView().wait(250).should('be.visible')
    cy.get('#wcs-download-links-list a:first').should('have.attr', 'href').then((href) => {
      cy.request('GET', href).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.headers['content-disposition']).to.match(/.*geomet-climate-DCS\.TN\.HISTO\.ENS.*tif.*$/)
      })
    })
  })

  it('Download data as PR, RCP26, 20-year average, 2081-2100, NetCDF', () => {
    cy.visit('/#/downscaled-data')

    // variable
    cy.selectVar('#var-sel-variable', 'Total precipitation', 'PR')

    // future
    cy.selectRadio('option-radio-options', 'RCP')

    // 20-year average
    cy.selectRadio('option-radio-time-range-type', 'year20')
    cy.selectVar('#var-sel-20-year-average-range', '2081-2100', '2081-2100')

    // download format
    cy.selectVar('#raster_download_format', 'NetCDF', 'image/netcdf')

    // visit download link
    cy.get('#wcs-download-links-list').scrollIntoView().wait(250).should('be.visible')
    cy.get('#wcs-download-links-list a:first').should('have.attr', 'href').then((href) => {
      cy.request('GET', href).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.headers['content-disposition']).to.match(/.*geomet-climate-DCS\.PR.*nc.*$/)
      })
    })


  })

  it('Download data as TX, RCP85, Monthly, 2010-01 to 2010-02, NetCDF', () => {
    cy.visit('/#/downscaled-data')

    // Zoom in to map
    cy.get('a.leaflet-control-zoom-in').scrollIntoView().wait(250).click()
    cy.wait(500) // mimic user pause after a zoom click
    cy.get('a.leaflet-control-zoom-in').click() // zoom twice
    cy.wait(500)

    // variable
    cy.selectVar('#var-sel-variable', 'Maximum temperature', 'TX')

    // future
    cy.selectRadio('option-radio-options', 'RCP')

    // RCP85
    cy.selectVar('#rcp_scenario', 'High emissions scenario (RCP 8.5)', 'RCP85')

    // Monthly
    cy.selectVar('#var-sel-time-interval--time-of-year', 'Monthly', 'ENS')

    // Date range
    cy.inputText('#date-start-date', '2010-01{enter}')
    cy.inputText('#date-end-date', '2010-02{enter}')

    // download format
    cy.selectVar('#raster_download_format', 'NetCDF', 'image/netcdf')

    // visit download link
    cy.get('#wcs-download-links-list').scrollIntoView().wait(250).should('be.visible')
    cy.get('#wcs-download-links-list a:first').should('have.attr', 'href').then((href) => {
      cy.request('GET', href).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.headers['content-disposition']).to.match(/.*geomet-climate-DCS\.TX\.RCP.*ENS\.ABS.*nc.*$/)
      })
    })
  })
})
