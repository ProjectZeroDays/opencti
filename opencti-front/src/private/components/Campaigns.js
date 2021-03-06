/* eslint-disable no-nested-ternary */
// TODO Remove no-nested-ternary
import React, { Component } from 'react';
import * as PropTypes from 'prop-types';
import {
  assoc, compose, defaultTo, lensProp, map, over, pipe,
} from 'ramda';
import graphql from 'babel-plugin-relay/macro';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import IconButton from '@material-ui/core/IconButton';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import {
  ArrowDropDown,
  ArrowDropUp,
  ArrowUpward,
  ArrowDownward,
  Dashboard,
  TableChart,
} from '@material-ui/icons';
import { fetchQuery, QueryRenderer } from '../../relay/environment';
import inject18n from '../../components/i18n';
import SearchInput from '../../components/SearchInput';
import StixDomainEntitiesImportData from './stix_domain_entity/StixDomainEntitiesImportData';
import StixDomainEntitiesExportData from './stix_domain_entity/StixDomainEntitiesExportData';
import CampaignsLines, { campaignsLinesQuery } from './campaign/CampaignsLines';
import CampaignsCards, {
  campaignsCardsQuery,
  nbCardsToLoad,
} from './campaign/CampaignsCards';
import CampaignCreation from './campaign/CampaignCreation';
import { dateFormat } from '../../utils/Time';

const styles = () => ({
  linesContainer: {
    marginTop: 10,
    paddingTop: 0,
  },
  item: {
    paddingLeft: 10,
    textTransform: 'uppercase',
    cursor: 'pointer',
  },
  parameters: {
    float: 'left',
    marginTop: -10,
  },
  views: {
    float: 'right',
    marginTop: -20,
  },
  inputLabel: {
    float: 'left',
  },
  sortField: {
    float: 'left',
  },
  sortFieldLabel: {
    margin: '10px 15px 0 0',
    fontSize: 14,
    float: 'left',
  },
  sortIcon: {
    float: 'left',
    margin: '-5px 0 0 15px',
  },
});

const inlineStyles = {
  iconSort: {
    position: 'absolute',
    margin: '0 0 0 5px',
    padding: 0,
    top: '0px',
  },
  name: {
    float: 'left',
    width: '70%',
    fontSize: 12,
    fontWeight: '700',
  },
  created: {
    float: 'left',
    width: '15%',
    fontSize: 12,
    fontWeight: '700',
  },
  modified: {
    float: 'left',
    fontSize: 12,
    fontWeight: '700',
  },
};

const exportCampaignsQuery = graphql`
  query CampaignsExportCampaignsQuery(
    $count: Int!
    $cursor: ID
    $orderBy: CampaignsOrdering
    $orderMode: OrderingMode
  ) {
    campaigns(
      first: $count
      after: $cursor
      orderBy: $orderBy
      orderMode: $orderMode
    ) @connection(key: "Pagination_campaigns") {
      edges {
        node {
          id
          name
          description
          first_seen
          last_seen
        }
      }
    }
  }
`;

class Campaigns extends Component {
  constructor(props) {
    super(props);
    this.state = {
      view: 'cards',
      sortBy: 'name',
      orderAsc: true,
      searchTerm: '',
      csvData: null,
    };
  }

  handleChangeView(mode) {
    this.setState({ view: mode });
  }

  handleSearch(value) {
    this.setState({ searchTerm: value });
  }

  handleChangeSortBy(event) {
    this.setState({ sortBy: event.target.value });
  }

  reverse() {
    this.setState({ orderAsc: !this.state.orderAsc });
  }

  reverseBy(field) {
    this.setState({ sortBy: field, orderAsc: !this.state.orderAsc });
  }

  SortHeader(field, label) {
    const { t } = this.props;
    return (
      <div
        style={inlineStyles[field]}
        onClick={this.reverseBy.bind(this, field)}
      >
        <span>{t(label)}</span>
        {this.state.sortBy === field ? (
          this.state.orderAsc ? (
            <ArrowDropDown style={inlineStyles.iconSort} />
          ) : (
            <ArrowDropUp style={inlineStyles.iconSort} />
          )
        ) : (
          ''
        )}
      </div>
    );
  }

  handleGenerateCSV() {
    this.setState({ csvData: null });
    const paginationOptions = {
      orderBy: this.state.sortBy,
      orderMode: this.state.orderAsc ? 'asc' : 'desc',
    };
    fetchQuery(exportCampaignsQuery, {
      count: 90000,
      ...paginationOptions,
    }).then((data) => {
      const finalData = pipe(
        map(n => n.node),
        map(n => over(lensProp('description'), defaultTo('-'))(n)),
        map(n => assoc('first_seen', dateFormat(n.first_seen))(n)),
        map(n => assoc('last_seen', dateFormat(n.last_seen))(n)),
        map(n => assoc('created', dateFormat(n.created))(n)),
        map(n => assoc('modified', dateFormat(n.modified))(n)),
      )(data.campaigns.edges);
      this.setState({ csvData: finalData });
    });
  }

  renderCardParameters() {
    const { t, classes } = this.props;
    return (
      <div>
        <div style={{ float: 'left', marginRight: 20 }}>
          <SearchInput
            variant="small"
            onChange={this.handleSearch.bind(this)}
          />
        </div>
        <InputLabel classes={{ root: classes.sortFieldLabel }}>
          {t('Sort by')}
        </InputLabel>
        <FormControl classes={{ root: classes.sortField }}>
          <Select
            name="sort-by"
            value={this.state.sortBy}
            onChange={this.handleChangeSortBy.bind(this)}
            inputProps={{
              name: 'sort-by',
              id: 'sort-by',
            }}
          >
            <MenuItem value="name">{t('Name')}</MenuItem>
            <MenuItem value="created">{t('Creation date')}</MenuItem>
            <MenuItem value="modified">{t('Modification date')}</MenuItem>
          </Select>
        </FormControl>
        <IconButton
          aria-label="Sort by"
          onClick={this.reverse.bind(this)}
          classes={{ root: classes.sortIcon }}
        >
          {this.state.orderAsc ? <ArrowDownward /> : <ArrowUpward />}
        </IconButton>
      </div>
    );
  }

  renderCards() {
    return (
      <QueryRenderer
        query={campaignsCardsQuery}
        variables={{
          count: nbCardsToLoad,
          orderBy: this.state.sortBy,
          orderMode: this.state.orderAsc ? 'asc' : 'desc',
        }}
        render={({ props }) => {
          if (props) {
            return (
              <CampaignsCards
                data={props}
                dummy={false}
                searchTerm={this.state.searchTerm}
              />
            );
          }
          return (
            <CampaignsCards
              data={null}
              dummy={true}
              searchTerm={this.state.searchTerm}
            />
          );
        }}
      />
    );
  }

  renderLinesParameters() {
    return (
      <div>
        <SearchInput variant="small" onChange={this.handleSearch.bind(this)} />
      </div>
    );
  }

  renderLines() {
    const { classes } = this.props;
    return (
      <List classes={{ root: classes.linesContainer }}>
        <ListItem
          classes={{ root: classes.item }}
          divider={false}
          style={{ paddingTop: 0 }}
        >
          <ListItemIcon>
            <span
              style={{ padding: '0 8px 0 8px', fontWeight: 700, fontSize: 12 }}
            >
              #
            </span>
          </ListItemIcon>
          <ListItemText
            primary={
              <div>
                {this.SortHeader('name', 'Name')}
                {this.SortHeader('created', 'Creation date')}
                {this.SortHeader('modified', 'Modification date')}
              </div>
            }
          />
        </ListItem>
        <QueryRenderer
          query={campaignsLinesQuery}
          variables={{
            count: 25,
            orderBy: this.state.sortBy,
            orderMode: this.state.orderAsc ? 'asc' : 'desc',
          }}
          render={({ props }) => {
            if (props) {
              return (
                <CampaignsLines
                  data={props}
                  dummy={false}
                  searchTerm={this.state.searchTerm}
                />
              );
            }
            return (
              <CampaignsLines
                data={null}
                dummy={true}
                searchTerm={this.state.searchTerm}
              />
            );
          }}
        />
      </List>
    );
  }

  render() {
    const { classes } = this.props;
    return (
      <div>
        <div className={classes.parameters}>
          {this.state.view === 'cards' ? this.renderCardParameters() : ''}
          {this.state.view === 'lines' ? this.renderLinesParameters() : ''}
        </div>
        <div className={classes.views}>
          <IconButton
            color={this.state.view === 'cards' ? 'secondary' : 'primary'}
            classes={{ root: classes.button }}
            onClick={this.handleChangeView.bind(this, 'cards')}
          >
            <Dashboard />
          </IconButton>
          <IconButton
            color={this.state.view === 'lines' ? 'secondary' : 'primary'}
            classes={{ root: classes.button }}
            onClick={this.handleChangeView.bind(this, 'lines')}
          >
            <TableChart />
          </IconButton>
          <StixDomainEntitiesImportData />
          <StixDomainEntitiesExportData
            fileName="Campaigns"
            handleGenerateCSV={this.handleGenerateCSV.bind(this)}
            csvData={this.state.csvData}
          />
        </div>
        <div className="clearfix" />
        {this.state.view === 'cards' ? this.renderCards() : ''}
        {this.state.view === 'lines' ? this.renderLines() : ''}
        <CampaignCreation
          paginationOptions={{
            orderBy: this.state.sortBy,
            orderMode: this.state.orderAsc ? 'asc' : 'desc',
          }}
        />
      </div>
    );
  }
}

Campaigns.propTypes = {
  classes: PropTypes.object,
  t: PropTypes.func,
  history: PropTypes.object,
};

export default compose(
  inject18n,
  withStyles(styles),
)(Campaigns);
