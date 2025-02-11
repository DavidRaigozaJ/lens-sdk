import { Profile } from '@lens-protocol/api-bindings';
import {
  createGetAllProfilesMockedResponse,
  mockLensApolloClient,
  mockProfileFragment,
  mockSources,
  simulateAuthenticatedProfile,
  simulateNotAuthenticated,
} from '@lens-protocol/api-bindings/mocks';
import { ProfileId } from '@lens-protocol/domain/entities';
import { mockProfile, mockProfileId } from '@lens-protocol/domain/mocks';
import { mockEthereumAddress } from '@lens-protocol/shared-kernel/mocks';
import { waitFor } from '@testing-library/react';

import { renderHookWithMocks } from '../../__helpers__/testing-library';
import { useProfilesOwnedBy, UseProfilesOwnedByArgs } from '../useProfilesOwnedBy';

function setupTestScenario({
  result,
  expectedObserverId,
  address,
  ...others
}: UseProfilesOwnedByArgs & { expectedObserverId?: ProfileId; result: Profile[] }) {
  const sources = mockSources();

  return renderHookWithMocks(() => useProfilesOwnedBy({ address, ...others }), {
    mocks: {
      sources,
      apolloClient: mockLensApolloClient([
        createGetAllProfilesMockedResponse({
          variables: {
            ...others,
            byOwnerAddresses: [address],
            observerId: expectedObserverId ?? null,
            limit: 10,
            sources,
          },
          profiles: result,
        }),
      ]),
    },
  });
}

describe(`Given the ${useProfilesOwnedBy.name} hook`, () => {
  const address = mockEthereumAddress();
  const profiles = [
    mockProfileFragment({ ownedBy: address }),
    mockProfileFragment({ ownedBy: address }),
  ];
  const expectations = profiles.map(({ id }) => ({ __typename: 'Profile', id }));

  describe('when the query returns data successfully', () => {
    beforeAll(() => {
      simulateNotAuthenticated();
    });

    it('should return the profiles owned by the specified address', async () => {
      const { result } = setupTestScenario({ address, result: profiles });

      await waitFor(() => expect(result.current.loading).toBeFalsy());
      expect(result.current.data).toMatchObject(expectations);
    });
  });

  describe('when there is an Active Profile defined', () => {
    const activeProfile = mockProfile();

    beforeAll(() => {
      simulateAuthenticatedProfile(activeProfile);
    });

    it('should use the Active Profile Id as the "observerId"', async () => {
      const { result } = setupTestScenario({
        address,
        result: profiles,
        expectedObserverId: activeProfile.id,
      });

      await waitFor(() => expect(result.current.loading).toBeFalsy());
      expect(result.current.data).toMatchObject(expectations);
    });

    it('should always allow to specify the "observerId" on a per-call basis', async () => {
      const observerId = mockProfileId();

      const { result } = setupTestScenario({
        address,
        observerId,
        result: profiles,
        expectedObserverId: observerId,
      });

      await waitFor(() => expect(result.current.loading).toBeFalsy());
      expect(result.current.data).toMatchObject(expectations);
    });
  });
});
