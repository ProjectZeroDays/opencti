import { queryMultiple, updateAttribute } from '../src/database/grakn';
import { index } from '../src/database/elasticSearch';

module.exports.up = async next => {
  ['sector', 'organization', 'user', 'region', 'country', 'city'].map(
    async entityType => {
      const query = `match $x isa entity; $x has stix_id $sid; $sid contains "${entityType}"; get $x;`;
      const entities = await queryMultiple(query, ['x']);
      entities.map(entity => {
        return updateAttribute(entity.x.id, {
          key: 'stix_id',
          value: [entity.x.stix_id.replace(entityType, 'identity')]
        }).then(stixDomainEntity => {
          index('stix-domain-entities', 'stix_domain_entity', stixDomainEntity);
        });
      });
    }
  );
  next();
};

module.exports.down = async next => {
  next();
};
