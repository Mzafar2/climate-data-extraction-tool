// https://docs.cypress.io/api/introduction/api.html

describe('E2E test for hydrometric data with various form options', () => {
  it('Check hydrometric stations and download daily mean data as CSV', () => {
    // station data
    cy.intercept('GET', /.*\/collections\/hydrometric-stations\/items\?.*f=json.*STATUS_EN=Active.*/).as('stationData')
    cy.visit('/#/water-quantity-data')
    cy.wait('@stationData', {timeout: 30000}).then((xhr) => {
      expect(xhr.response.headers).to.have.property('access-control-allow-headers')
      expect(xhr.response.headers).to.have.property('access-control-allow-origin')
      expect(xhr.response.body).to.have.property('type')
      expect(xhr.response.body.type).to.equal('FeatureCollection')
      expect(xhr.response.body.features.length).to.be.greaterThan(2700)
    })

    // discontinued stations
    cy.intercept('GET', /.*\/collections\/hydrometric-stations\/items\?f=json&limit=10000&properties=PROV_TERR_STATE_LOC,STATION_NAME,STATION_NUMBER,STATUS_EN$/).as('entireStationData')
    cy.get('#toggle-discontinued-stations').click()
    cy.wait('@entireStationData', {timeout: 30000}).then((xhr) => {
      expect(xhr.response.headers).to.have.property('access-control-allow-headers')
      expect(xhr.response.headers).to.have.property('access-control-allow-origin')
      expect(xhr.response.body).to.have.property('type')
      expect(xhr.response.body.type).to.equal('FeatureCollection')
      expect(xhr.response.body.features.length).to.be.greaterThan(7800)
    })
    cy.get('table#station-select-table').scrollIntoView().wait(250).find('tr.selectableStation').should(($tr) => {
      expect($tr.length).to.be.greaterThan(7800)
    })

    // Remove showing discontinued stations
    cy.get('#toggle-discontinued-stations').click()
    cy.get('table#station-select-table').scrollIntoView().wait(250).find('tr.selectableStation').should(($tr) => {
      expect($tr.length).to.be.lessThan(2800)
    })

    // Stations are loaded on the map as clusters
    cy.checkMarkerClusters(10)

    // value type
    cy.selectVar('select#var-sel-value-type--time-interval', 'Daily mean', 'hydrometric-daily-mean')

    // geojson
    cy.selectVar('select#vector_download_format', 'CSV', 'csv')

    // retrieve download list
    cy.intercept('GET', /.*\/collections\/hydrometric-daily-mean\/items.*/).as('countData')
    cy.get('#retrieve-download-links').scrollIntoView().wait(250).click()
    cy.contains('#num-records-wfs3-download', /Total number of records: \d+/).should('be.visible')
    cy.wait('@countData', {timeout: 30000}).then((xhr) => {
      expect(xhr.request.method).to.equal('GET')
      expect(xhr.response.body).to.have.property('type')
      expect(xhr.response.body.type).to.equal('FeatureCollection')
      expect(xhr.response.body.numberMatched).to.be.greaterThan(62976000)
    })

    // visit download link (limit 1)
    cy.get('#wfs3-link-list').scrollIntoView().wait(250).should('be.visible')
    cy.get('#wfs3-link-list').find('a').should('have.lengthOf', 420)
    cy.get('#wfs3-link-list a:first').should('have.attr', 'href').then((href) => {
      let hrefLimited = href.replace(/limit=\d+/, 'limit=1')
      cy.request('GET', hrefLimited).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.body).to.match(/^x,y,IDENTIFIER,STATION_NAME,STATION_NUMBER,PROV_TERR_STATE_LOC,DATE,LEVEL,DISCHARGE,DISCHARGE_SYMBOL_EN,DISCHARGE_SYMBOL_FR,LEVEL_SYMBOL_EN,LEVEL_SYMBOL_FR.*/)
      })
    })
  })

  it('Download monthly mean data as GeoJSON by province', () => {
    // Reset map
    cy.get('#reset-map-view').scrollIntoView().wait(250).click()

    // Province
    cy.selectVar('select#cccs_province', 'British Columbia', 'BC')
    cy.get('table#station-select-table').scrollIntoView().wait(250).find('tr.selectedStation').should(($tr) => {
      expect($tr.length).to.be.greaterThan(430)
    })

    // value type
    cy.selectVar('select#var-sel-value-type--time-interval', 'Monthly mean', 'hydrometric-monthly-mean')

    // date change
    cy.inputText('input#date-start-date', '1899-01{enter}')
    cy.inputText('input#date-end-date', '2020-12{enter}')

    // geojson
    cy.selectVar('select#vector_download_format', 'GeoJSON', 'geojson')

    // retrieve download links
    cy.intercept('GET', /.*\/collections\/hydrometric-monthly-mean\/items\?.*PROV_TERR_STATE_LOC=BC.*resulttype=hits.*f=json.*/).as('countData')
    cy.get('#retrieve-download-links').scrollIntoView().wait(250).click()
    cy.contains('#num-records-wfs3-download', /Total number of records: \d+/).should('be.visible')
    cy.wait('@countData', {timeout: 30000}).then((xhr) => {
      expect(xhr.request.method).to.equal('GET')
      expect(xhr.response.body).to.have.property('type')
      expect(xhr.response.body.type).to.equal('FeatureCollection')
      expect(xhr.response.body.numberMatched).to.be.greaterThan(428000)
    })

    // visit download link (limit 1)
    cy.get('#wfs3-link-list').scrollIntoView().wait(250).should('be.visible')
    cy.get('#wfs3-link-list a:first').should('have.attr', 'href').then((href) => {
      let hrefLimited = href.replace(/limit=\d+/, 'limit=1')
      cy.request('GET', hrefLimited).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.body.numberMatched).to.be.greaterThan(428000)
      })
    })
  })

  it('Download annual peaks as GeoJSON by a select few stations', () => {
    // Reset province
    cy.selectVar('select#cccs_province', '-- None --', 'null')

    // Reset map
    cy.get('#reset-map-view').scrollIntoView().wait(250).click()

    // Select stations by table
    cy.get('table#station-select-table').scrollIntoView().wait(250)
    cy.get('table#station-select-table tr.selectable:contains(08GA030):first').click()
    cy.get('table#station-select-table tr.selectable:contains(02HC048):first').click()
    cy.get('table#station-select-table tr.selectable:contains(02OA041):first').click()
    cy.get('button#show-selected-stations').click()
    cy.get('table#station-select-table').find('tr.selectedStation').should(($tr) => {
      expect($tr.length).to.equal(3)
    })

    // value type
    cy.selectVar('select#var-sel-value-type--time-interval', 'Annual max/min', 'hydrometric-annual-peaks')

    // date change
    cy.inputText('input#date-start-date', '2000-01-01{enter}')
    cy.inputText('input#date-end-date', '2010-12-31{enter}')

    // geojson
    cy.selectVar('select#vector_download_format', 'GeoJSON', 'geojson')

    // retrieve download links
    cy.intercept('GET', /.*\/collections\/hydrometric-annual-peaks\/items.*/).as('countData')
    cy.get('#retrieve-download-links').click()
    cy.contains('#num-records-wfs3-download', /Total number of records: \d+/).should('be.visible')
    cy.wait('@countData', {timeout: 30000}).then((xhr) => {
      expect(xhr.request.method).to.equal('GET')
      expect(xhr.response.body).to.have.property('type')
      expect(xhr.response.body.type).to.equal('FeatureCollection')
      expect(xhr.response.body.numberMatched).to.be.greaterThan(20)
    })

    // visit download link (limit 1)
    cy.get('#wfs3-link-list').should('be.visible')
    cy.get('#wfs3-link-list a:first').should('have.attr', 'href').then((href) => {
      let hrefLimited = href.replace(/limit=\d+/, 'limit=1')
      cy.request('GET', hrefLimited).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.body.numberMatched).to.be.greaterThan(20)
      })
    })
  })

  it('Download daily max/min as GeoJSON by a zoomed BBOX', () => {
    // Reset map
    cy.get('#reset-map-view').scrollIntoView().wait(250).click()

    // Reset station selection
    cy.get('#clear-selected-stations').scrollIntoView().wait(250).click()

    cy.get('#map-loading-screen').should('be.hidden')

    // Zoom in to map
    cy.get('a.leaflet-control-zoom-in').scrollIntoView().wait(250).click()
    cy.wait(500) // mimic user pause after a zoom click
    cy.get('a.leaflet-control-zoom-in').click() // zoom twice
    cy.wait(500) // mimic user pause after a zoom click
    cy.get('table#station-select-table').scrollIntoView().wait(250).find('tr.selectableStation').should(($tr) => {
      expect($tr.length).to.be.lessThan(200)
    })

    // value type
    cy.selectVar('select#var-sel-value-type--time-interval', 'Daily max/min', 'hydrometric-annual-statistics')

    // date change
    cy.inputText('input#date-start-date', '2010-01-01{enter}')
    cy.inputText('input#date-end-date', '2020-12-31{enter}')

    // geojson
    cy.selectVar('select#vector_download_format', 'GeoJSON', 'geojson')

    // retrieve download links
    cy.intercept('GET', /.*\/collections\/hydrometric-annual-statistics\/items.*/).as('countData')
    cy.get('#retrieve-download-links').scrollIntoView().wait(250).click()
    cy.contains('#num-records-wfs3-download', /Total number of records: \d+/).should('be.visible')
    cy.wait('@countData', {timeout: 30000}).then((xhr) => {
      expect(xhr.request.method).to.equal('GET')
      expect(xhr.response.body).to.have.property('type')
      expect(xhr.response.body.type).to.equal('FeatureCollection')
      expect(xhr.response.body.numberMatched).to.be.greaterThan(500)
    })

    // visit download link (limit 1)
    cy.get('#wfs3-link-list').scrollIntoView().wait(250).should('be.visible')
    cy.get('#wfs3-link-list a:first').should('have.attr', 'href').then((href) => {
      let hrefLimited = href.replace(/limit=\d+/, 'limit=1')
      cy.request('GET', hrefLimited).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.body.numberMatched).to.be.greaterThan(500)
      })
    })
  })
})