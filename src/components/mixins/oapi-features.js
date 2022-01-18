/*
Anything common to WFS query UI goes here with default values provided in data()
*/

import datasetCols from '@/static/datasetCols.js'

export const oapif = {
  data () {
    return {
      oapif_format: 'csv',
      bbox_parts: {
        min_x: 0,
        min_y: 0,
        max_x: 0,
        max_y: 0
      },
      oapif_province: 'null',
      oapif_layer: null,
      oapif_layer_station: null,
      oapif_selected_station_ids: [],
      oapif_station_limit: 10000,
      oapif_limit: 150000,
      oapif_max_limit: 1000000,
      oapif_min_limit: 1,
      date_start: null,
      date_end: null,
      mapMaxZoom: 12,
      ...datasetCols
    }
  },
  beforeMount () {
    // reset existing selections that share with other components
    this.$store.dispatch('stations/changeProvince', 'null') // to share with bbox
  },
  watch: {
    date_start: function (newVal) {
      this.$store.commit('stations/changeStationState', {
        stateProp: 'dateStart',
        stateValue: this.convertDateToMoment(newVal)
      })
    },
    date_end: function (newVal) {
      this.$store.commit('stations/changeStationState', {
        stateProp: 'dateEnd',
        stateValue: this.convertDateToMoment(newVal)
      })
    }
  },
  computed: {
    stationProvCol: function () { // province column for station table
      const routeName = this.$route.name
      const climateStationSets = ['monthly', 'daily', 'normals', 'hourly']
      if (climateStationSets.indexOf(routeName) !== -1) {
        return 'PROV_STATE_TERR_CODE'
      } else {
        return this.datasetToProvColName[routeName]
      }
    },
    stnPrimaryId: function () {
      return this.datasetToStnColName[this.$route.name]
    },
    dateConfigs: function () {
      if (this.oapif_layer === 'climate-monthly') {
        return {
          minimumView: 'month',
          format: 'YYYY-MM',
          placeholder: 'YYYY-MM'
        }
      } else {
        return {
          minimumView: 'day',
          format: 'YYYY-MM-DD',
          placeholder: 'YYYY-MM-DD'
        }
      }
    },
    dateMoment: function () {
      return {
        min: this.$moment.utc(this.date_min),
        max: this.$moment.utc(this.date_max)
      }
    },
    dateStartEmpty: function () {
      return this.date_start === null || this.date_start === 'Invalid date'
    },
    dateEndEmpty: function () {
      return this.date_end === null || this.date_end === 'Invalid date'
    },
    dateRangeHasNull: function () {
      return this.dateStartEmpty || this.dateEndEmpty
    },
    dateStartIsEmptyOnly: function () {
      if (this.dateStartEmpty && !this.dateEndEmpty) {
        return true
      } else {
        return false
      }
    },
    dateEndIsEmptyOnly: function () {
      if (this.dateEndEmpty && !this.dateStartEmpty) {
        return true
      } else {
        return false
      }
    },
    dateRangeErrorMessage: function () {
      if (this.dateStartIsEmptyOnly || this.dateEndIsEmptyOnly) {
        return this.$gettext('Date range fields must be all set or cleared.')
      }
      if (this.dateRangeHasBadRange) {
        return this.$gettext('The start date cannot be greater than the end date.')
      }
      return '' // no errors
    },
    temporal: function () {
      if (this.dateRangeIsValid) {
        if (this.hasInvalidMomentDate) {
          return null
        } else {
          let format = this.dateConfigs.format
          let start = this.$moment.utc(this.date_start).format(format)
          let end = this.$moment.utc(this.date_end).format(format)
          if (this.oapif_layer === 'climate-daily' || this.oapif_layer === 'climate-hourly') {
            // format = 'YYYY-MM-DD HH:mm:ss'
            start += ' 00:00:00'
            end += ' 00:00:00'
          }
          return 'datetime=' + start + '/' + end
        }
      } else {
        return null
      }
    },
    hasInvalidMomentDate: function () {
      let format = this.dateConfigs.format
      let start = this.$moment.utc(this.date_start, format).format(format)
      let end = this.$moment.utc(this.date_end, format).format(format)

      return (start === 'Invalid date' || end === 'Invalid date')
    },
    dateRangeIsValid: function () {
      if (this.hasInvalidMomentDate) {
        return false
      } else if (this.dateRangeHasNull) { // Date range is valid enough to generate a date range string
        return false
      } else {
        return true
      }
    },
    datesCleared: function () {
      return this.dateStartEmpty && this.dateEndEmpty
    },
    dateRangeHasBadRange: function () {
      if (this.datesCleared) { // don't determine bad range if dates are cleared
        return false
      } else if (this.$moment.utc(this.date_end, this.dateConfigs.format).format('YYYY-MM-DD') <= this.$moment.utc(this.date_start, this.dateConfigs.format).format('YYYY-MM-DD')) {
        return true
      } else {
        return false
      }
    },
    dateRangePastLimits: function () {
      let start = this.$moment.utc(this.date_start)
      let end = this.$moment.utc(this.date_end)
      let minimumView = this.dateConfigs.minimumView

      return start.isBefore(this.date_min, minimumView) ||
        start.isAfter(this.date_max, minimumView) ||
        end.isBefore(this.date_min, minimumView) ||
        end.isAfter(this.date_max, minimumView)
    },
    hasErrors: function () {
      return this.dateRangeHasBadRange ||
        this.dateRangePastLimits ||
        this.dateStartIsEmptyOnly ||
        this.dateEndIsEmptyOnly ||
        this.noProvinceStationSelected
    },
    spatialSelectPriority: function () {
      // Determines spatial selection priority: point, province, bbox
      if (this.oapif_selected_station_ids.length > 0) {
        return 'station'
      } else if (this.oapif_province !== 'null') {
        return 'province'
      } else if (this.ows_bbox !== null) {
        return 'bbox'
      } else {
        return true
      }
    },
    stationsSelected: function () {
      return this.oapif_selected_station_ids.length > 0
    },
    provinceSelected: function () {
      return this.oapif_province !== 'null'
    },
    noProvinceStationSelected: function () {
      return !this.stationsSelected && !this.provinceSelected && this.$store.getters['map/getBboxStationsTotal'] === 0
    },
    layer_options: function () {
      let layers = {}
      layers[this.oapif_layer] = this.currentRouteTitle
      return layers
    }
  },
  methods: {
    splitBBOXString: function () {
      let bboxSplit = this.ows_bbox.split(',')
      this.bbox_parts.min_x = bboxSplit[0]
      this.bbox_parts.min_y = bboxSplit[1]
      this.bbox_parts.max_x = bboxSplit[2]
      this.bbox_parts.max_y = bboxSplit[3]
    },
    generateWFSBBOXParam: function () {
      return '&BBOX=' + this.ows_bbox
    },
    clearDates: function () {
      this.date_start = null
      this.date_end = null
    },
    getWFS3CommonParams: function (layerName) {
      let urlParams = []

      if (typeof layerName === 'undefined') {
        layerName = this.oapif_layer
      }

      // temporal
      if (this.temporal !== null && this.temporal !== '') {
        urlParams.push(this.temporal)
      }

      let stnColName = this.datasetToStnColName[this.$route.name]
      let provColName = this.datasetToProvColName[this.$route.name]

      // Spatial selection priority: station, province, bbox
      switch (this.spatialSelectPriority) {
        case 'station':
          urlParams.push(stnColName + '=' + this.oapif_selected_station_ids.join('|'))
          break
        case 'province':
          urlParams.push(provColName + '=' + this.oapif_province)
          break
        case 'bbox':
          urlParams.push('bbox=' + this.ows_bbox)
          break
        default:
          // No spatial query applied
      }

      // sort
      let dateColName = this.datasetToDateColName[this.$route.name]
      let sortOrder = [provColName] // default with province

      // Special case for specific layers
      if (Object.prototype.hasOwnProperty.call(this.layerToColSortOrder, layerName)) {
        if (layerName.includes('ltce')) {
          sortOrder = this.layerToColSortOrder[layerName]
        } else {
          sortOrder = sortOrder.concat(this.layerToColSortOrder[layerName])
        }
      } else {
        sortOrder = sortOrder.concat([stnColName, dateColName])
      }

      urlParams.push('sortby=' + sortOrder.join(','))

      return urlParams
    },
    getWFS3CommonURL: function (layerName) {
      let url = this.oapif_url_base
      url += '/' + layerName
      url += '/items?'

      let urlParams = this.getWFS3CommonParams(layerName)

      url += urlParams.join('&')

      return url
    },
    oapif_download_url: function (layerName) {
      let url = this.oapif_url_base
      url += '/' + layerName
      url += '/items?'

      let urlParams = this.getWFS3CommonParams(layerName)

      // Limit validation
      if (this.oapif_limit >= this.oapif_min_limit && this.oapif_limit <= this.oapif_max_limit) {
        if (this.oapif_limit !== '') {
          urlParams.push('limit=' + this.oapif_limit)
        }
      }

      // format selection
      if (this.oapif_format !== 'geojson') { // default is geoJSON
        urlParams.push('f=' + this.oapif_format)
      }

      url += urlParams.join('&')
      return url
    },
    convertDateToMoment: function (date) {
      if (Object.prototype.toString.call(date) === '[object Date]') {
        return this.$moment.utc(date)
      } else {
        return this.$moment.utc(date, this.dateConfigs.format)
      }
    }
  }
}